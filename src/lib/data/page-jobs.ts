/**
 * Per-page job model (Phase 3) — pure helpers and the page-level watchdog rules.
 *
 * A scan is decomposed into independent `pageJobs`, each claimed and run on its
 * own so a single hanging or broken page cannot stall or sink the whole scan.
 * The decision logic here is pure (no Firestore) so it is unit-testable; the
 * worker applies the returned actions via state-re-checking transactions.
 */
import type { PageJob } from "./types";
import type { ScanPhase } from "./types";

/** Retries per page (the initial attempt + one requeue). */
export const PAGE_JOB_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.PAGE_JOB_MAX_ATTEMPTS ?? 2)
);

/** Hard per-page wall-clock budget, enforced by the processor's timeout. */
export const PAGE_JOB_DEADLINE_MS = Math.max(
  10_000,
  Number(process.env.PAGE_JOB_DEADLINE_MS ?? 60_000)
);

/**
 * Heartbeat age after which a running pageJob is considered abandoned (its
 * worker died). Must exceed the page deadline so a legitimately-running page
 * is never reclaimed mid-scan.
 */
export const PAGE_JOB_STALE_MS = Math.max(
  PAGE_JOB_DEADLINE_MS + 15_000,
  Number(process.env.PAGE_JOB_STALE_MS ?? 90_000)
);

/**
 * Generous overall cap for a whole scan, enforced by the sweeper. Replaces the
 * old global 120s scan deadline now that pages run independently.
 */
export const SCAN_OVERALL_CAP_MS = Math.max(
  60_000,
  Number(process.env.SCAN_OVERALL_CAP_MS ?? 15 * 60_000)
);

/** Feature flag: when off, the legacy monolithic scan path runs unchanged. */
export function pageJobsEnabled(): boolean {
  const value = process.env.PAGE_JOBS_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export interface PageFinalizeState {
  pagesTotal: number;
  pagesDone: number;
  pagesFailed: number;
  phase: ScanPhase | null | undefined;
}

export interface PageFinalizePlan {
  pagesDone: number;
  pagesFailed: number;
  aggregationWon: boolean;
  nextPhase: ScanPhase | null;
}

/**
 * Pure counterpart of the Firestore completion transaction. Firestore retries
 * transactions against the latest scan snapshot, so concurrent completions
 * are serialized through this calculation and exactly one sees the terminal
 * counter reach pagesTotal while phase is still `scanning`.
 */
export function planPageFinalize(
  scan: PageFinalizeState,
  kind: "done" | "failed"
): PageFinalizePlan {
  const pagesDone = scan.pagesDone + (kind === "done" ? 1 : 0);
  const pagesFailed = scan.pagesFailed + (kind === "failed" ? 1 : 0);
  const aggregationWon =
    scan.pagesTotal > 0 &&
    pagesDone + pagesFailed >= scan.pagesTotal &&
    scan.phase === "scanning";
  return {
    pagesDone,
    pagesFailed,
    aggregationWon,
    nextPhase: aggregationWon ? "aggregating" : scan.phase ?? null,
  };
}

export function terminalScanPhase(
  pagesDone: number,
  pagesFailed: number
): "completed" | "completed_with_errors" | "failed" {
  if (pagesDone === 0) return "failed";
  return pagesFailed > 0 ? "completed_with_errors" : "completed";
}

export type SweepablePageJob = Pick<
  PageJob,
  | "id"
  | "scanJobId"
  | "workspaceId"
  | "status"
  | "attempts"
  | "maxAttempts"
  | "heartbeatAt"
  | "startedAt"
  | "createdAt"
>;

export type PageJobSweepAction =
  | {
      type: "requeue";
      workspaceId: string;
      scanId: string;
      pageJobId: string;
      previousAttempts: number;
    }
  | {
      type: "fail";
      workspaceId: string;
      scanId: string;
      pageJobId: string;
      errorCode: string;
      error: string;
      attempts: number;
    };

export interface PageJobSweepThresholds {
  staleMs: number;
  maxAttempts: number;
}

export function defaultPageJobSweepThresholds(): PageJobSweepThresholds {
  return { staleMs: PAGE_JOB_STALE_MS, maxAttempts: PAGE_JOB_MAX_ATTEMPTS };
}

function millis(value: Date | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : value.getTime();
}

function heartbeatReferenceMs(doc: SweepablePageJob): number | null {
  return millis(doc.heartbeatAt) ?? millis(doc.startedAt) ?? millis(doc.createdAt);
}

/**
 * Pure sweep over non-terminal pageJobs. Only `running` jobs are swept:
 * a stale heartbeat means the worker died, so requeue (if attempts remain) or
 * fail (if exhausted). Queued pageJobs are left for a worker to claim; a scan
 * that never makes progress is caught by the scan-level overall cap.
 */
export function sweepPageJobs(
  now: Date | number,
  docs: SweepablePageJob[],
  thresholds: PageJobSweepThresholds = defaultPageJobSweepThresholds()
): PageJobSweepAction[] {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const actions: PageJobSweepAction[] = [];

  for (const doc of docs) {
    if (doc.status !== "running") continue;
    const reference = heartbeatReferenceMs(doc);
    const stale = reference === null || nowMs - reference > thresholds.staleMs;
    if (!stale) continue;

    const attempts = doc.attempts ?? 0;
    const maxAttempts = doc.maxAttempts ?? thresholds.maxAttempts;
    if (attempts >= maxAttempts) {
      actions.push({
        type: "fail",
        workspaceId: doc.workspaceId,
        scanId: doc.scanJobId,
        pageJobId: doc.id,
        errorCode: "worker_heartbeat_stale",
        error: "The worker processing this page stopped responding.",
        attempts,
      });
    } else {
      actions.push({
        type: "requeue",
        workspaceId: doc.workspaceId,
        scanId: doc.scanJobId,
        pageJobId: doc.id,
        previousAttempts: attempts,
      });
    }
  }

  return actions;
}

/** Is a running pageJob's heartbeat stale enough to reclaim? */
export function isPageJobHeartbeatStale(
  job: Pick<PageJob, "status" | "heartbeatAt" | "startedAt" | "createdAt">,
  at = Date.now(),
  staleMs = PAGE_JOB_STALE_MS
): boolean {
  if (job.status !== "running") return false;
  const reference = heartbeatReferenceMs(job as SweepablePageJob);
  if (reference === null) return true;
  return at - reference > staleMs;
}
