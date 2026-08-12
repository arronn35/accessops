import type { ScanJob } from "./types";

function numberFromEnv(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
}

export const WORKER_STALE_RUNNING_MS = numberFromEnv(
  "WORKER_STALE_RUNNING_MS",
  45_000,
  15_000
);

export const WORKER_STALE_RECLAIM_LIMIT = Math.floor(
  numberFromEnv("WORKER_STALE_RECLAIM_LIMIT", 3, 1)
);

function scanWorkerReferenceTime(
  job: Pick<
    ScanJob,
    "processorHeartbeatAt" | "processorStartedAt" | "startedAt" | "updatedAt" | "createdAt"
  >
): Date | null {
  return (
    job.processorHeartbeatAt ??
    job.processorStartedAt ??
    job.startedAt ??
    job.updatedAt ??
    job.createdAt ??
    null
  );
}

export function isScanWorkerHeartbeatStale(
  job: Pick<
    ScanJob,
    | "status"
    | "processorHeartbeatAt"
    | "processorStartedAt"
    | "startedAt"
    | "updatedAt"
    | "createdAt"
  >,
  at = Date.now()
): boolean {
  if (job.status !== "running") return false;
  const reference = scanWorkerReferenceTime(job);
  if (!reference) return true;
  return at - reference.getTime() > WORKER_STALE_RUNNING_MS;
}

export function isScanOwnedByWorker<
  T extends Pick<ScanJob, "status" | "claimedBy">
>(
  job: T | null,
  workerId: string
): job is T {
  return (
    job?.status === "running" &&
    Boolean(workerId) &&
    job.claimedBy === workerId
  );
}
