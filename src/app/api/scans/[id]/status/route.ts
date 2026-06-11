import { NextRequest } from "next/server";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { getScanJob } from "@/lib/data/firestore";
import { isScanWorkerHeartbeatStale } from "@/lib/data/scan-lifecycle";

export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job) throw new ApiError(404, "not_found");
    const workerHeartbeatStale = isScanWorkerHeartbeatStale(job);

    return Response.json(
      {
        id: job.id,
        status: job.status,
        progressStep: job.progressStep,
        pagesScanned: job.pagesScanned,
        pagesDiscovered: job.pagesDiscovered,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
        queueAttempts: job.queueAttempts ?? 0,
        processorStartedAt: job.processorStartedAt,
        processorHeartbeatAt: job.processorHeartbeatAt,
        workerHeartbeatStale,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return apiError(err);
  }
}
