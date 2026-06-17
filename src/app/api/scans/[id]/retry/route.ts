import { NextRequest } from "next/server";
import {
  apiError,
  ApiError,
  rateLimitError,
  requireSession,
} from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  audit,
  clearScanResultCollections,
  deletePageJobs,
  getScanJob,
  updateScanJob,
} from "@/lib/data/firestore";
import { isScanWorkerHeartbeatStale } from "@/lib/data/scan-lifecycle";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job) throw new ApiError(404, "not_found");
    const retryableRunning = job.status === "running" && isScanWorkerHeartbeatStale(job);
    if (job.status !== "failed" && job.progressStep !== "queue_retry_pending" && !retryableRunning) {
      throw new ApiError(409, "not_retryable", `Scan cannot be retried from ${job.status}.`);
    }
    const rl = await checkRateLimit("scanCreate", ctx.userId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining, "Too many scans started recently.");

    if (job.usePageJobs) {
      await Promise.all([
        deletePageJobs(ctx.workspaceId, id),
        clearScanResultCollections(ctx.workspaceId, id),
      ]);
    }

    await updateScanJob(ctx.workspaceId, id, {
      status: "queued",
      progressStep: "queued",
      pagesScanned: 0,
      pagesDiscovered: 0,
      pagesDone: 0,
      pagesTotal: 0,
      pagesFailed: 0,
      phase: null,
      currentUrl: null,
      currentStep: "queued",
      currentState: null,
      lastProgressAt: null,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      errorCode: null,
      queueAttempts: 0,
      reclaimAttempts: 0,
      lastQueuePublishedAt: null,
      processorStartedAt: null,
      processorHeartbeatAt: null,
      processorError: null,
      // Re-enter the queue as a fresh entry: the sweeper measures queue_timeout
      // from createdAt, so a retry of an old scan must reset it or it would be
      // failed again on the next sweep.
      createdAt: new Date(),
    });

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "scan.retried",
      resourceType: "scan_job",
      resourceId: id,
      metadata: { mode: "queued" },
    });
    return Response.json({ ok: true, scanJobId: id, mode: "queued" });
  } catch (err) {
    return apiError(err);
  }
}
