/**
 * Percevia AI scan worker — HTTP "serve" mode for scale-to-zero Cloud Run.
 *
 * Unlike the long-running poller in `index.ts`, this entrypoint does NOT poll.
 * It stays idle (scaled to zero by Cloud Run) until a request arrives:
 *
 *   POST /process   — drain all currently-claimable work (scans, page jobs,
 *                     one data-deletion job) using the real Playwright + axe
 *                     engine, run an aggregation pass, then return. Cloud Tasks
 *                     delivers these (see src/lib/scanner/dispatch.ts); the
 *                     shared INTERNAL_WORKER_SECRET guards the endpoint.
 *   GET  /health   — liveness; 503 once the shared Chromium is unrecoverable.
 *
 * Dispatch (who calls /process):
 *   - POST /api/scans enqueues a task on scan creation.
 *   - Cloud Scheduler → /api/internal/scans/sweep re-enqueues stale/queued work.
 *
 * Correctness across overlapping invocations is guaranteed by the same atomic
 * Firestore claims the poller uses: every job is processed at most once.
 *
 * Run:  npm run worker:serve     (tsx worker/serve.ts)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import {
  claimAggregation,
  claimPageJob,
  claimScanJob,
  getScanJob,
  listAggregationCandidates,
  listClaimablePageJobRefs,
  listClaimableScanRefs,
  requeuePageJobOnShutdown,
  requeueScanOnShutdown,
  renewOwnedScanClaim,
  updateScanJob,
  type ClaimablePageJobRef,
  type ClaimableScanRef,
} from "@/lib/data/firestore";
import {
  claimDataDeletionJob,
  listClaimableDataDeletionJobs,
  runDataDeletionJob,
  touchDataDeletionJob,
} from "@/lib/data/deletion";
import { recordWorkerHeartbeat } from "@/lib/data/worker-health";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { aggregateScan } from "@/lib/scanner/persistence";
import { processScanJob } from "./process-job";
import { processPageJob } from "./process-page-job";
import { getBrowserManager } from "./browser-manager";
import { scanContextPool } from "@/lib/scanner/context-pool";
import { claimMissBackoffMs } from "./claim-backoff";

function durationFromEnv(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
}

const WORKER_ID = `${process.env.HOSTNAME ?? "serve"}-${randomUUID().slice(0, 8)}`;
const CONCURRENCY = Math.floor(durationFromEnv("WORKER_CONCURRENCY", 2, 1));
const HEARTBEAT_MS = durationFromEnv("WORKER_HEARTBEAT_MS", 15_000, 5_000);
// Wall-clock budget for one /process invocation. Must stay below the Cloud Run
// request timeout (`--timeout`). Remaining work is left claimable and picked up
// by the next task or the sweeper.
const PROCESS_BUDGET_MS = durationFromEnv("WORKER_PROCESS_BUDGET_MS", 240_000, 10_000);
const SHUTDOWN_DRAIN_MS = durationFromEnv(
  "WORKER_SHUTDOWN_DRAIN_MS",
  5_000,
  0
);
const CLAIM_MISS_BACKOFF_BASE_MS = durationFromEnv(
  "WORKER_CLAIM_MISS_BACKOFF_BASE_MS",
  25,
  5
);
const CLAIM_MISS_BACKOFF_MAX_MS = durationFromEnv(
  "WORKER_CLAIM_MISS_BACKOFF_MAX_MS",
  250,
  CLAIM_MISS_BACKOFF_BASE_MS
);

let browserUnhealthy = false;
let processing = false;
let deletionInflight = false;
let shuttingDown = false;
const activeScans = new Map<string, ClaimableScanRef>();
const activePageJobs = new Map<string, ClaimablePageJobRef>();

interface DrainStats {
  scans: number;
  pages: number;
  deletions: number;
}

function logErr(scope: string) {
  return (err: unknown) => console.error(`[serve] ${scope} error`, err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runScan(ref: ClaimableScanRef, stats: DrainStats): Promise<void> {
  const job = await claimScanJob(ref.workspaceId, ref.scanId, WORKER_ID);
  if (!job) return; // lost the race, or no longer claimable
  const key = `${ref.workspaceId}/${ref.scanId}`;
  activeScans.set(key, ref);
  stats.scans += 1;
  console.log(`[serve] claimed ${job.id} — ${job.scanType} ${job.baseUrl}`);
  const heartbeat = setInterval(() => {
    void updateScanJob(job.workspaceId, job.id, {
      processorHeartbeatAt: new Date(),
    }).catch(() => undefined);
  }, HEARTBEAT_MS);
  try {
    await processScanJob(job);
    console.log(`[serve] finished ${job.id}`);
  } finally {
    clearInterval(heartbeat);
    activeScans.delete(key);
  }
}

type PageRunResult = "claimed" | "progress" | "miss";

async function runPage(
  ref: ClaimablePageJobRef,
  stats: DrainStats
): Promise<PageRunResult> {
  const claim = await claimPageJob(
    ref.workspaceId,
    ref.scanId,
    ref.pageJobId,
    WORKER_ID
  );
  if (claim.disposition !== "claimed") {
    return claim.disposition === "discarded" ? "progress" : "miss";
  }
  const job = claim.job;
  const key = `${ref.workspaceId}/${ref.scanId}/${ref.pageJobId}`;
  activePageJobs.set(key, ref);
  const scan = await getScanJob(ref.workspaceId, ref.scanId);
  if (!scan) {
    await requeuePageJobOnShutdown(
      ref.workspaceId,
      ref.scanId,
      ref.pageJobId,
      WORKER_ID
    );
    activePageJobs.delete(key);
    return "miss";
  }
  stats.pages += 1;
  console.log(`[serve] claimed page ${job.id} — ${job.url}`);
  try {
    await processPageJob(job, scan);
  } finally {
    activePageJobs.delete(key);
  }
  return "claimed";
}

async function runDeletion(jobId: string, stats: DrainStats): Promise<void> {
  const job = await claimDataDeletionJob(jobId, WORKER_ID);
  if (!job) return;
  stats.deletions += 1;
  console.log(`[serve] claimed deletion job ${job.id} — workspace ${job.workspaceId}`);
  const heartbeat = setInterval(() => {
    void touchDataDeletionJob(job.id).catch(() => undefined);
  }, HEARTBEAT_MS);
  try {
    const finished = await runDataDeletionJob(job);
    console.log(`[serve] finished deletion job ${job.id}`, finished.deletedCounts ?? {});
  } finally {
    clearInterval(heartbeat);
  }
}

async function runAggregation(
  scan: Awaited<ReturnType<typeof getScanJob>>
): Promise<void> {
  if (!scan) return;
  const beat = () =>
    renewOwnedScanClaim(scan.workspaceId, scan.id, WORKER_ID);
  if (!(await beat())) return;
  const heartbeat = setInterval(() => void beat().catch(() => undefined), HEARTBEAT_MS);
  try {
    await aggregateScan(scan.id, {
      workspaceId: scan.workspaceId,
      userId: scan.requestedBy,
      workerId: WORKER_ID,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * Claim and run every available unit of work until nothing is claimable or the
 * time budget is exhausted. Bounded by WORKER_CONCURRENCY concurrent contexts.
 */
async function drainWork(deadline: number): Promise<DrainStats> {
  const stats: DrainStats = { scans: 0, pages: 0, deletions: 0 };
  const inflight = new Set<Promise<void>>();
  let pageClaimMissStreak = 0;

  while (!browserUnhealthy && !shuttingDown && Date.now() < deadline) {
    const capacity = CONCURRENCY - inflight.size;
    if (capacity <= 0) {
      await Promise.race(inflight);
      continue;
    }

    // At most one data-deletion job at a time, alongside scans.
    if (!deletionInflight) {
      const deletionJobs = await listClaimableDataDeletionJobs(1);
      if (deletionJobs[0]) {
        deletionInflight = true;
        const id = deletionJobs[0].id;
        const tracked = runDeletion(id, stats)
          .catch(logErr(`deletion ${id}`))
          .finally(() => {
            deletionInflight = false;
            inflight.delete(tracked);
          });
        inflight.add(tracked);
        continue;
      }
    }

    const [scanRefs, pageRefs] = await Promise.all([
      listClaimableScanRefs(1),
      listClaimablePageJobRefs(capacity),
    ]);

    if (!scanRefs[0] && pageRefs.length === 0) {
      if (inflight.size === 0) break; // nothing left to do
      await Promise.race(inflight); // let running work create more page jobs
      continue;
    }

    if (scanRefs[0]) {
      const ref = scanRefs[0];
      const tracked = runScan(ref, stats)
        .catch(logErr(`scan ${ref.scanId}`))
        .finally(() => inflight.delete(tracked));
      inflight.add(tracked);
    }
    for (const ref of pageRefs) {
      if (inflight.size >= CONCURRENCY) break;
      const tracked = runPage(ref, stats)
        .then(async (result) => {
          if (result !== "miss") {
            pageClaimMissStreak = 0;
            return;
          }
          pageClaimMissStreak += 1;
          await sleep(
            claimMissBackoffMs(
              pageClaimMissStreak,
              CLAIM_MISS_BACKOFF_BASE_MS,
              CLAIM_MISS_BACKOFF_MAX_MS
            )
          );
        })
        .catch(logErr(`page ${ref.pageJobId}`))
        .finally(() => inflight.delete(tracked));
      inflight.add(tracked);
    }
  }

  await Promise.allSettled([...inflight]);

  // Aggregate any scan whose page jobs have all finished (atomic claim makes
  // this safe even if the sweeper races us).
  if (Date.now() < deadline) {
    const candidates = await listAggregationCandidates();
    for (const scan of candidates) {
      if (Date.now() >= deadline) break;
      if (await claimAggregation(scan.workspaceId, scan.id, WORKER_ID)) {
        await runAggregation(scan).catch(logErr(`aggregate ${scan.id}`));
      }
    }
  }

  return stats;
}

async function waitForProcessing(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (processing && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !processing;
}

async function requeueActiveWork(): Promise<void> {
  const scans = [...activeScans.values()];
  const pages = [...activePageJobs.values()];
  await Promise.allSettled([
    ...scans.map((ref) =>
      requeueScanOnShutdown(ref.workspaceId, ref.scanId, WORKER_ID)
    ),
    ...pages.map((ref) =>
      requeuePageJobOnShutdown(
        ref.workspaceId,
        ref.scanId,
        ref.pageJobId,
        WORKER_ID
      )
    ),
  ]);
}

function readBody(req: IncomingMessage, limitBytes = 64 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleProcess(req: IncomingMessage): Promise<{ status: number; body: unknown }> {
  const secret = process.env.INTERNAL_WORKER_SECRET;
  if (!secret || req.headers["x-internal-worker-secret"] !== secret) {
    return { status: 401, body: { ok: false, error: "unauthorized" } };
  }
  if (browserUnhealthy) {
    return { status: 503, body: { ok: false, error: "browser_unhealthy" } };
  }
  // Cloud Run is configured with concurrency=1, but guard against overlap so a
  // health probe or stray duplicate never starts a second drain on this box.
  if (processing) {
    return { status: 200, body: { ok: true, busy: true } };
  }

  let payload: { scanJobId?: string } = {};
  try {
    const raw = await readBody(req);
    if (raw) payload = JSON.parse(raw);
  } catch {
    // Body is advisory only (drain-all ignores it beyond logging); tolerate it.
  }

  processing = true;
  const startedAt = Date.now();
  try {
    void recordWorkerHeartbeat({ workerId: WORKER_ID, inflight: 0, shuttingDown: false }).catch(
      () => undefined
    );
    const stats = await drainWork(startedAt + PROCESS_BUDGET_MS);
    const durationMs = Date.now() - startedAt;
    console.log(
      `[serve] /process done in ${durationMs}ms — scans=${stats.scans} pages=${stats.pages} deletions=${stats.deletions}` +
        (payload.scanJobId ? ` (trigger=${payload.scanJobId})` : "")
    );
    void recordWorkerHeartbeat({ workerId: WORKER_ID, inflight: 0, shuttingDown: false }).catch(
      () => undefined
    );
    if (browserUnhealthy) {
      return { status: 503, body: { ok: false, error: "browser_unhealthy", ...stats } };
    }
    return { status: 200, body: { ok: true, durationMs, ...stats } };
  } finally {
    processing = false;
  }
}

function startServer(): Server {
  const port = Number(process.env.PORT ?? process.env.WORKER_HEALTH_PORT ?? 8080);
  const server = createServer((req, res) => {
    const url = (req.url ?? "/").split("?")[0];

    if (req.method === "GET" && url === "/health") {
      const ok = !browserUnhealthy;
      res.writeHead(ok ? 200 : 503, {
        "cache-control": "no-store",
        "content-type": "application/json",
      });
      res.end(
        JSON.stringify({
          ok,
          service: "percevia-scan-worker",
          mode: "serve",
          workerId: WORKER_ID,
          processing,
          browserHealthy: !browserUnhealthy,
          browser: getBrowserManager().stats(),
          // Contexts are the memory unit; `queued` above zero for long means
          // the ceiling, not the CPU, is what is pacing scans.
          contexts: {
            size: scanContextPool().size,
            inFlight: scanContextPool().inFlight,
            queued: scanContextPool().queued,
          },
          ts: new Date().toISOString(),
        })
      );
      return;
    }

    if (req.method === "POST" && url === "/process") {
      void handleProcess(req)
        .then(({ status, body }) => {
          res.writeHead(status, { "content-type": "application/json" });
          res.end(JSON.stringify(body));
        })
        .catch((err) => {
          console.error("[serve] /process handler error", err);
          if (!res.headersSent) {
            res.writeHead(500, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "process_failed" }));
          }
        });
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  server.listen(port, () => {
    console.log(`[serve] listening on :${port} — concurrency=${CONCURRENCY}, worker=${WORKER_ID}`);
  });
  return server;
}

async function main(): Promise<void> {
  if (!firebaseAdminConfigured()) {
    console.error(
      "[serve] Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
    process.exit(1);
  }

  // A Chromium that can no longer be relaunched makes this instance useless:
  // flag unhealthy so /health 503s and in-flight /process returns 503 (the
  // Cloud Task retries on a fresh instance), then exit so Cloud Run recycles us.
  getBrowserManager().onUnhealthy = (err) => {
    if (browserUnhealthy) return;
    browserUnhealthy = true;
    console.error(`[serve] browser unrecoverable — exiting for restart: ${err.message}`);
    setTimeout(() => process.exit(1), 250);
  };

  const server = startServer();

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[serve] ${signal} received — closing.`);
      server.close(() => undefined);
      void (async () => {
        const drained = await waitForProcessing(SHUTDOWN_DRAIN_MS);
        if (!drained) await requeueActiveWork();
        await getBrowserManager().close().catch(() => undefined);
        process.exit(0);
      })();
    });
  }
}

void main();
