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
 * automatic via the stale-heartbeat reclaim in `claimScanJob`.
 *
 * Run:  npm run worker        (tsx worker/index.ts)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import {
  claimScanJob,
  listClaimableScanRefs,
  updateScanJob,
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
import { processScanJob } from "./process-job";

const WORKER_ID = `${process.env.HOSTNAME ?? "worker"}-${randomUUID().slice(0, 8)}`;
const POLL_INTERVAL_MS = Math.max(
  500,
  Number(process.env.WORKER_POLL_INTERVAL_MS ?? 3_000)
);
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2));
const HEARTBEAT_MS = Math.max(
  5_000,
  Number(process.env.WORKER_HEARTBEAT_MS ?? 15_000)
);

let shuttingDown = false;
const inflight = new Set<Promise<void>>();
let healthServer: Server | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  try {
    await processScanJob(job);
    console.log(`[worker] finished ${job.id}`);
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
    if (deletionJobs[0]) {
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

  const refs = await listClaimableScanRefs(capacity);
  for (const ref of refs) {
    if (shuttingDown) break;
    const tracked = claimAndRun(ref)
      .catch((err) =>
        console.error(`[worker] job ${ref.scanId} error`, err)
      )
      .finally(() => inflight.delete(tracked));
    inflight.add(tracked);
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

    res.writeHead(shuttingDown ? 503 : 200, {
      "cache-control": "no-store",
      "content-type": "application/json",
    });
    res.end(
      JSON.stringify({
        ok: !shuttingDown,
        service: "accessops-scan-worker",
        workerId: WORKER_ID,
        inflight: inflight.size,
        shuttingDown,
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

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
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
    await sleep(POLL_INTERVAL_MS);
  }

  await Promise.allSettled([...inflight]);
  clearInterval(livenessInterval);
  await beat(); // record the drained, shutting-down state
  await new Promise<void>((resolve) => {
    if (!healthServer) {
      resolve();
      return;
    }
    healthServer.close(() => resolve());
  });
  console.log("[worker] drained — shutting down.");
  process.exit(0);
}

void main();
