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

    await updateScanJob(ctx.workspaceId, id, {
      status: "queued",
      progressStep: "queued",
      pagesScanned: 0,
      pagesDiscovered: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      queueAttempts: 0,
      lastQueuePublishedAt: null,
      processorStartedAt: null,
      processorHeartbeatAt: null,
      processorError: null,
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
