/**
 * Watchdog sweeper rules — guarantees no scan job stays in limbo.
 *
 * The decision logic is a pure function (`sweepScans`) over scan-job
 * snapshots so the rules are unit-testable without Firestore. The worker
 * runs it on an independent interval and applies the returned actions via
 * transactions that re-check state (see `applySweepAction` in firestore.ts),
 * which makes concurrent sweepers and stale snapshots safe: an action that
 * no longer matches the live document is a no-op.
 *
 * Rules:
 *   1. running + heartbeat older than SWEEP_STALE_RUNNING_MS
 *        → requeue (increment reclaimAttempts, clear claimedBy)
 *   2. running/queued + reclaimAttempts >= limit
 *        → fail with errorCode "worker_heartbeat_stale"
 *   3. queued + createdAt older than SWEEP_QUEUE_TIMEOUT_MS
 *        → fail with errorCode "queue_timeout"
 *        (catches dead-worker and missing-index scenarios where nothing
 *         ever claims the queue)
 *   Terminal states are never touched.
 */
import type { ScanJob } from "./types";
import {
  WORKER_STALE_RECLAIM_LIMIT,
  WORKER_STALE_RUNNING_MS,
} from "./scan-lifecycle";
import { SCAN_OVERALL_CAP_MS } from "./page-jobs";

function durationFromEnv(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
}

/** Heartbeat age after which a running job is considered abandoned. */
export const SWEEP_STALE_RUNNING_MS = durationFromEnv(
  "SWEEP_STALE_RUNNING_MS",
  WORKER_STALE_RUNNING_MS,
  15_000
);

/** Age after which a still-queued job is failed instead of left waiting. */
export const SWEEP_QUEUE_TIMEOUT_MS = durationFromEnv(
  "SWEEP_QUEUE_TIMEOUT_MS",
  30 * 60_000,
  60_000
);

export type SweepErrorCode =
  | "worker_heartbeat_stale"
  | "queue_timeout"
  | "scan_deadline_exceeded";

/** User-facing failure messages, keyed by machine-readable error code. */
export const SWEEP_ERROR_MESSAGES: Record<SweepErrorCode, string> = {
  worker_heartbeat_stale: "The scan worker stopped responding. Please retry.",
  queue_timeout:
    "No worker capacity was available. Please retry or contact support.",
  scan_deadline_exceeded:
    "The scan exceeded its overall processing window. Partial page results may be available.",
};

export type SweepableScan = Pick<
  ScanJob,
  | "id"
  | "workspaceId"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "startedAt"
  | "processorStartedAt"
  | "processorHeartbeatAt"
  | "reclaimAttempts"
  | "phase"
  | "usePageJobs"
>;

export type SweepAction =
  | {
      type: "requeue";
      workspaceId: string;
      scanId: string;
      /** reclaimAttempts value before this requeue. */
      previousAttempts: number;
    }
  | {
      type: "fail";
      workspaceId: string;
      scanId: string;
      errorCode: SweepErrorCode;
      errorMessage: string;
      reclaimAttempts: number;
    };

export interface SweepThresholds {
  staleRunningMs: number;
  queueTimeoutMs: number;
  reclaimLimit: number;
  overallCapMs: number;
}

export function defaultSweepThresholds(): SweepThresholds {
  return {
    staleRunningMs: SWEEP_STALE_RUNNING_MS,
    queueTimeoutMs: SWEEP_QUEUE_TIMEOUT_MS,
    reclaimLimit: WORKER_STALE_RECLAIM_LIMIT,
    overallCapMs: SCAN_OVERALL_CAP_MS,
  };
}

function millis(value: Date | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : value.getTime();
}

/**
 * Last time we heard from the worker that owns a running job. Falls back
 * through older timestamps so legacy documents (created before
 * processorHeartbeatAt existed) still age out instead of living forever.
 */
function heartbeatReferenceMs(doc: SweepableScan): number | null {
  return (
    millis(doc.processorHeartbeatAt) ??
    millis(doc.processorStartedAt) ??
    millis(doc.startedAt) ??
    millis(doc.updatedAt) ??
    millis(doc.createdAt)
  );
}

/**
 * Pure sweep decision function: given the current time and a snapshot of
 * non-terminal scan docs, return the actions a sweeper should take.
 * Never returns actions for terminal jobs.
 */
export function sweepScans(
  now: Date | number,
  docs: SweepableScan[],
  thresholds: SweepThresholds = defaultSweepThresholds()
): SweepAction[] {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const actions: SweepAction[] = [];

  for (const doc of docs) {
    if (doc.status !== "running" && doc.status !== "queued") continue;
    const attempts = doc.reclaimAttempts ?? 0;

    // Once crawl resolution has produced pageJobs, the scan-level worker no
    // longer owns the scan continuously. Page workers have independent
    // heartbeats, so the scan-level watchdog applies only the generous overall
    // cap during scanning/aggregation instead of reclaiming healthy work.
    if (
      doc.status === "running" &&
      doc.usePageJobs &&
      (doc.phase === "scanning" || doc.phase === "aggregating")
    ) {
      const started =
        millis(doc.startedAt) ?? millis(doc.processorStartedAt) ?? millis(doc.createdAt);
      if (started === null || nowMs - started > thresholds.overallCapMs) {
        actions.push({
          type: "fail",
          workspaceId: doc.workspaceId,
          scanId: doc.id,
          errorCode: "scan_deadline_exceeded",
          errorMessage: SWEEP_ERROR_MESSAGES.scan_deadline_exceeded,
          reclaimAttempts: attempts,
        });
      }
      continue;
    }

    if (attempts >= thresholds.reclaimLimit) {
      actions.push({
        type: "fail",
        workspaceId: doc.workspaceId,
        scanId: doc.id,
        errorCode: "worker_heartbeat_stale",
        errorMessage: SWEEP_ERROR_MESSAGES.worker_heartbeat_stale,
        reclaimAttempts: attempts,
      });
      continue;
    }

    if (doc.status === "running") {
      const reference = heartbeatReferenceMs(doc);
      const stale =
        reference === null || nowMs - reference > thresholds.staleRunningMs;
      if (!stale) continue;
      if (attempts + 1 >= thresholds.reclaimLimit) {
        actions.push({
          type: "fail",
          workspaceId: doc.workspaceId,
          scanId: doc.id,
          errorCode: "worker_heartbeat_stale",
          errorMessage: SWEEP_ERROR_MESSAGES.worker_heartbeat_stale,
          reclaimAttempts: attempts + 1,
        });
      } else {
        actions.push({
          type: "requeue",
          workspaceId: doc.workspaceId,
          scanId: doc.id,
          previousAttempts: attempts,
        });
      }
      continue;
    }

    // status === "queued"
    const createdAtMs = millis(doc.createdAt);
    if (createdAtMs === null || nowMs - createdAtMs > thresholds.queueTimeoutMs) {
      actions.push({
        type: "fail",
        workspaceId: doc.workspaceId,
        scanId: doc.id,
        errorCode: "queue_timeout",
        errorMessage: SWEEP_ERROR_MESSAGES.queue_timeout,
        reclaimAttempts: attempts,
      });
    }
  }

  return actions;
}
