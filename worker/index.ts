/**
 * AccessOps browser scan worker.
 *
 * A long-running container that polls Firestore for queued scan jobs, claims
 * them atomically, and runs the real Playwright + axe-core engine
 * (`runScanJob`). This is the production scan path — Vercel serverless cannot
 * run Chromium, so all real scanning happens here.
 *
 * Dispatch is polling (no queue infra): `POST /api/scans` writes a `queued`
 * job; this worker picks it up. Concurrency is bounded and crash recovery is
 * automatic via an independent stale-heartbeat sweeper.
 *
 * Run:  npm run worker        (tsx worker/index.ts)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import {
  applyPageJobSweepAction,
  applySweepAction,
  claimAggregation,
  claimPageJob,
  claimScanJob,
  getScanJob,
  listAggregationCandidates,
  listClaimablePageJobRefs,
  listClaimableScanRefs,
  listSweepablePageJobs,
  listSweepableScans,
  requeuePageJobOnShutdown,
  requeueScanOnShutdown,
  updateScanJob,
  type ClaimablePageJobRef,
  type ClaimableScanRef,
} from "@/lib/data/firestore";
import { sweepScans } from "@/lib/data/scan-sweeper";
import { sweepPageJobs } from "@/lib/data/page-jobs";
import {
  claimDataDeletionJob,
  listClaimableDataDeletionJobs,
  runDataDeletionJob,
  touchDataDeletionJob,
} from "@/lib/data/deletion";
import { recordWorkerHeartbeat } from "@/lib/data/worker-health";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { processScanJob } from "./process-job";
import { processPageJob } from "./process-page-job";
import { getBrowserManager } from "./browser-manager";
import { aggregateScan } from "@/lib/scanner/persistence";

function durationFromEnv(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
}

const WORKER_ID = `${process.env.HOSTNAME ?? "worker"}-${randomUUID().slice(0, 8)}`;
const POLL_INTERVAL_MS = durationFromEnv("WORKER_POLL_INTERVAL_MS", 3_000, 500);
const CONCURRENCY = Math.floor(
  durationFromEnv("WORKER_CONCURRENCY", 2, 1)
);
const HEARTBEAT_MS = durationFromEnv("WORKER_HEARTBEAT_MS", 15_000, 5_000);
const SWEEP_INTERVAL_MS = 60_000;
const SHUTDOWN_DRAIN_MS = durationFromEnv(
  "WORKER_SHUTDOWN_DRAIN_MS",
  5_000,
  0
);

let shuttingDown = false;
// Set when the shared Chromium can no longer be (re)launched. The worker then
// fails /healthz and exits nonzero so the platform (Railway) restarts it.
let browserUnhealthy = false;
const inflight = new Set<Promise<void>>();
const activeScans = new Map<
  string,
  { ref: ClaimableScanRef; stopHeartbeat: () => void }
>();
const activePageJobs = new Map<string, ClaimablePageJobRef>();
let healthServer: Server | null = null;
let sweepInProgress = false;
let preferPageJob = true;
let resolveShutdownSignal: (() => void) | null = null;
const shutdownSignal = new Promise<void>((resolve) => {
  resolveShutdownSignal = resolve;
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scanKey(ref: ClaimableScanRef): string {
  return `${ref.workspaceId}/${ref.scanId}`;
}

function pageJobKey(ref: ClaimablePageJobRef): string {
  return `${ref.workspaceId}/${ref.scanId}/${ref.pageJobId}`;
}

async function claimAndRun(ref: ClaimableScanRef): Promise<void> {
  const job = await claimScanJob(ref.workspaceId, ref.scanId, WORKER_ID);
  if (!job) return; // lost the race, or no longer claimable

  console.log(`[worker] claimed ${job.id} — ${job.scanType} ${job.baseUrl}`);
  // Keep the heartbeat fresh during long pages so the job is not mistaken for
  // orphaned (and so a peer worker does not steal it mid-scan).
  const heartbeat = setInterval(() => {
    void updateScanJob(job.workspaceId, job.id, {
      processorHeartbeatAt: new Date(),
    }).catch(() => undefined);
  }, HEARTBEAT_MS);
  const refForJob = { workspaceId: job.workspaceId, scanId: job.id };
  const key = scanKey(refForJob);
  activeScans.set(key, {
    ref: refForJob,
    stopHeartbeat: () => clearInterval(heartbeat),
  });

  try {
    await processScanJob(job);
    console.log(`[worker] finished ${job.id}`);
  } finally {
    clearInterval(heartbeat);
    activeScans.delete(key);
  }
}

async function claimAndRunPage(ref: ClaimablePageJobRef): Promise<void> {
  const job = await claimPageJob(
    ref.workspaceId,
    ref.scanId,
    ref.pageJobId,
    WORKER_ID
  );
  if (!job) return;
  const scan = await getScanJob(ref.workspaceId, ref.scanId);
  if (!scan) {
    await requeuePageJobOnShutdown(
      ref.workspaceId,
      ref.scanId,
      ref.pageJobId,
      WORKER_ID
    );
    return;
  }

  const key = pageJobKey(ref);
  activePageJobs.set(key, ref);
  console.log(`[worker] claimed page ${job.id} — ${job.url}`);
  try {
    await processPageJob(job, scan);
  } finally {
    activePageJobs.delete(key);
  }
}

async function runAggregationForScan(
  scan: Awaited<ReturnType<typeof getScanJob>>
): Promise<void> {
  if (!scan) return;
  const beat = () =>
    updateScanJob(scan.workspaceId, scan.id, {
      claimedBy: WORKER_ID,
      processorHeartbeatAt: new Date(),
    });
  await beat();
  const heartbeat = setInterval(() => void beat().catch(() => undefined), HEARTBEAT_MS);
  try {
    await aggregateScan(scan.id, {
      workspaceId: scan.workspaceId,
      userId: scan.requestedBy,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

let deletionInflight = false;

async function claimAndRunDeletion(jobId: string): Promise<void> {
  const job = await claimDataDeletionJob(jobId, WORKER_ID);
  if (!job) return; // lost the race, or no longer claimable

  console.log(`[worker] claimed deletion job ${job.id} — workspace ${job.workspaceId}`);
  const heartbeat = setInterval(() => {
    void touchDataDeletionJob(job.id).catch(() => undefined);
  }, HEARTBEAT_MS);

  try {
    const finished = await runDataDeletionJob(job);
    console.log(
      `[worker] finished deletion job ${job.id}`,
      finished.deletedCounts ?? {}
    );
  } finally {
    clearInterval(heartbeat);
  }
}

async function tick(): Promise<void> {
  // Privacy deletion jobs are rare and quick; run at most one alongside scans.
  if (!deletionInflight && !shuttingDown) {
    const deletionJobs = await listClaimableDataDeletionJobs(1);
    if (deletionJobs[0] && !shuttingDown) {
      deletionInflight = true;
      const jobId = deletionJobs[0].id;
      const tracked: Promise<void> = claimAndRunDeletion(jobId)
        .catch((err) => console.error(`[worker] deletion job ${jobId} error`, err))
        .finally(() => {
          deletionInflight = false;
          inflight.delete(tracked);
        });
      inflight.add(tracked);
    }
  }

  const capacity = CONCURRENCY - inflight.size;
  if (capacity <= 0) return;

  const [scanRefs, pageRefs] = await Promise.all([
    listClaimableScanRefs(1),
    listClaimablePageJobRefs(capacity),
  ]);
  const firstScan = scanRefs[0];

  if (capacity === 1) {
    const runPage = pageRefs[0] && (preferPageJob || !firstScan);
    preferPageJob = !preferPageJob;
    if (runPage) {
      const ref = pageRefs[0];
      const tracked = claimAndRunPage(ref)
        .catch((err) => console.error(`[worker] page job ${ref.pageJobId} error`, err))
        .finally(() => inflight.delete(tracked));
      inflight.add(tracked);
    } else if (firstScan) {
      const tracked = claimAndRun(firstScan)
        .catch((err) => console.error(`[worker] job ${firstScan.scanId} error`, err))
        .finally(() => inflight.delete(tracked));
      inflight.add(tracked);
    }
    return;
  }

  if (firstScan && !shuttingDown) {
    const tracked = claimAndRun(firstScan)
      .catch((err) => console.error(`[worker] job ${firstScan.scanId} error`, err))
      .finally(() => inflight.delete(tracked));
    inflight.add(tracked);
  }

  for (const ref of pageRefs) {
    if (shuttingDown || inflight.size >= CONCURRENCY) break;
    const tracked = claimAndRunPage(ref)
      .catch((err) =>
        console.error(`[worker] page job ${ref.pageJobId} error`, err)
      )
      .finally(() => inflight.delete(tracked));
    inflight.add(tracked);
  }
}

async function runSweep(): Promise<void> {
  if (sweepInProgress || shuttingDown) return;
  sweepInProgress = true;
  try {
    const [scanDocs, pageDocs] = await Promise.all([
      listSweepableScans(),
      listSweepablePageJobs(),
    ]);
    const at = new Date();
    const scanActions = sweepScans(at, scanDocs);
    const pageActions = sweepPageJobs(at, pageDocs);
    const [scanResults, pageResults] = await Promise.all([
      Promise.allSettled(scanActions.map(applySweepAction)),
      Promise.allSettled(pageActions.map(applyPageJobSweepAction)),
    ]);
    let applied = 0;
    for (const result of scanResults) {
      if (result.status === "fulfilled") {
        if (result.value) applied += 1;
      } else {
        console.error("[worker] sweeper action failed", result.reason);
      }
    }
    const aggregationScans = new Set<string>();
    for (let index = 0; index < pageResults.length; index += 1) {
      const result = pageResults[index];
      if (result.status === "fulfilled") {
        if (result.value.applied) applied += 1;
        if (result.value.aggregationWon) {
          const action = pageActions[index];
          aggregationScans.add(`${action.workspaceId}/${action.scanId}`);
        }
      } else {
        console.error("[worker] page sweeper action failed", result.reason);
      }
    }
    if (applied > 0) {
      console.log(
        `[worker] sweeper applied ${applied}/${scanActions.length + pageActions.length} action(s)`
      );
    }

    for (const key of aggregationScans) {
      const [workspaceId, scanId] = key.split("/");
      await runAggregationForScan(await getScanJob(workspaceId, scanId));
    }

    const candidates = await listAggregationCandidates();
    for (const scan of candidates) {
      if (await claimAggregation(scan.workspaceId, scan.id, WORKER_ID)) {
        await runAggregationForScan(scan);
      }
    }
  } catch (err) {
    console.error("[worker] sweep error", err);
  } finally {
    sweepInProgress = false;
  }
}

async function waitForInflight(timeoutMs: number): Promise<boolean> {
  if (inflight.size === 0) return true;

  let timer: NodeJS.Timeout | undefined;
  const drained = Promise.allSettled([...inflight]).then(() => true);
  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  const result = await Promise.race([drained, timedOut]);
  if (timer) clearTimeout(timer);
  return result;
}

async function requeueActiveScans(): Promise<void> {
  let pending = [...activeScans.values()];
  for (const active of pending) active.stopHeartbeat();

  for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt += 1) {
    const results = await Promise.allSettled(
      pending.map(async (active) =>
        requeueScanOnShutdown(
          active.ref.workspaceId,
          active.ref.scanId,
          WORKER_ID
        )
      )
    );
    const retry: typeof pending = [];
    let requeued = 0;
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.status === "rejected") {
        retry.push(pending[index]);
        console.error("[worker] shutdown requeue failed", result.reason);
      } else if (result.value) {
        requeued += 1;
      }
    }
    if (requeued > 0) {
      console.log(`[worker] requeued ${requeued} unfinished scan(s) on shutdown`);
    }
    pending = retry;
    if (pending.length > 0 && attempt < 3) await sleep(250 * attempt);
  }

  if (pending.length > 0) {
    throw new Error(`failed_to_requeue_${pending.length}_scan(s)_on_shutdown`);
  }
}

async function requeueActivePageJobs(): Promise<void> {
  let pending = [...activePageJobs.values()];
  for (let attempt = 1; attempt <= 3 && pending.length > 0; attempt += 1) {
    const results = await Promise.allSettled(
      pending.map((ref) =>
        requeuePageJobOnShutdown(
          ref.workspaceId,
          ref.scanId,
          ref.pageJobId,
          WORKER_ID
        )
      )
    );
    const retry: typeof pending = [];
    let requeued = 0;
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.status === "rejected") retry.push(pending[index]);
      else if (result.value) requeued += 1;
    }
    if (requeued > 0) {
      console.log(`[worker] requeued ${requeued} unfinished page job(s) on shutdown`);
    }
    pending = retry;
    if (pending.length > 0 && attempt < 3) await sleep(250 * attempt);
  }
  if (pending.length > 0) {
    throw new Error(`failed_to_requeue_${pending.length}_page_job(s)_on_shutdown`);
  }
}

function startHealthServer(): void {
  const portRaw = process.env.WORKER_HEALTH_PORT ?? process.env.PORT;
  if (!portRaw) return;
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    console.warn(`[worker] invalid health port: ${portRaw}`);
    return;
  }

  healthServer = createServer((req, res) => {
    if (req.url !== "/healthz") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "not_found" }));
      return;
    }

    // A worker whose Chromium can no longer be relaunched is unhealthy: it can
    // still serve pages a static fallback but its core engine is dead, so report
    // 503 and let the platform recycle the container.
    const browser = getBrowserManager().stats();
    const ok = !shuttingDown && !browserUnhealthy;
    res.writeHead(ok ? 200 : 503, {
      "cache-control": "no-store",
      "content-type": "application/json",
    });
    res.end(
      JSON.stringify({
        ok,
        service: "accessops-scan-worker",
        workerId: WORKER_ID,
        inflight: inflight.size,
        shuttingDown,
        browserHealthy: !browserUnhealthy,
        browser,
        ts: new Date().toISOString(),
      })
    );
  });

  healthServer.listen(port, () => {
    console.log(`[worker] health listening on :${port}/healthz`);
  });
}

async function main(): Promise<void> {
  if (!firebaseAdminConfigured()) {
    console.error(
      "[worker] Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
    process.exit(1);
  }

  console.log(
    `[worker] starting ${WORKER_ID} — concurrency=${CONCURRENCY} poll=${POLL_INTERVAL_MS}ms`
  );
  startHealthServer();

  // One shared Chromium for the whole process (Phase 4). If it can no longer be
  // relaunched after a crash, fail fast: flag unhealthy so /healthz 503s and
  // start a clean shutdown that exits nonzero for the platform to restart us.
  getBrowserManager().onUnhealthy = (err) => {
    if (browserUnhealthy) return;
    browserUnhealthy = true;
    process.exitCode = 1;
    console.error(`[worker] browser unrecoverable — exiting for restart: ${err.message}`);
    if (!shuttingDown) {
      shuttingDown = true;
      resolveShutdownSignal?.();
    }
  };

  // Worker-level liveness for the web app's deep health check
  // (GET /api/healthz?deep=1), independent of any claimed job.
  const beat = () =>
    recordWorkerHeartbeat({
      workerId: WORKER_ID,
      inflight: inflight.size,
      shuttingDown,
    }).catch((err) =>
      console.warn("[worker] heartbeat write failed", (err as Error).message)
    );
  await beat();
  const livenessInterval = setInterval(() => void beat(), HEARTBEAT_MS);
  void runSweep();
  const sweepInterval = setInterval(() => void runSweep(), SWEEP_INTERVAL_MS);

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      resolveShutdownSignal?.();
      console.log(
        `[worker] ${signal} received — draining ${inflight.size} in-flight job(s)...`
      );
    });
  }

  while (!shuttingDown) {
    try {
      await tick();
    } catch (err) {
      console.error("[worker] poll error", err);
    }
    if (shuttingDown) break;
    await Promise.race([sleep(POLL_INTERVAL_MS), shutdownSignal]);
  }

  clearInterval(sweepInterval);
  const drained = await waitForInflight(SHUTDOWN_DRAIN_MS);
  if (!drained) {
    try {
      await Promise.all([requeueActiveScans(), requeueActivePageJobs()]);
    } catch (err) {
      console.error("[worker] could not hand off all scans before shutdown", err);
      process.exitCode = 1;
    }
  }
  // Tear down the shared Chromium once in-flight jobs have drained / handed off.
  await getBrowserManager().close().catch(() => undefined);
  clearInterval(livenessInterval);
  await beat(); // record the drained, shutting-down state
  await new Promise<void>((resolve) => {
    if (!healthServer) {
      resolve();
      return;
    }
    healthServer.close(() => resolve());
  });
  console.log("[worker] shutdown complete.");
  process.exit(Number(process.exitCode ?? 0));
}

void main();
