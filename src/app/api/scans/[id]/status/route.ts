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
        phase: job.phase ?? null,
        progressStep: job.progressStep,
        pagesScanned: job.pagesScanned,
        pagesDiscovered: job.pagesDiscovered,
        pagesDone: job.pagesDone ?? job.pagesScanned,
        pagesFailed: job.pagesFailed ?? 0,
        pagesTotal:
          job.pagesTotal ?? Math.max(job.pagesScanned, job.pagesDiscovered),
        currentUrl: job.currentUrl ?? null,
        currentStep: job.currentStep ?? job.progressStep,
        currentState: job.currentState ?? null,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        lastProgressAt: job.lastProgressAt ?? null,
        errorMessage: job.errorMessage,
        errorCode: job.errorCode ?? null,
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
