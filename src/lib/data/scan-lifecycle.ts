import type { ScanJob } from "./types";

export const WORKER_STALE_RUNNING_MS = Math.max(
  30_000,
  Number(process.env.WORKER_STALE_RUNNING_MS ?? 180_000)
);

export const WORKER_STALE_RECLAIM_LIMIT = Math.max(
  1,
  Number(process.env.WORKER_STALE_RECLAIM_LIMIT ?? 3)
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
