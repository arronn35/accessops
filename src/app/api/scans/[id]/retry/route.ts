import { NextRequest } from "next/server";
import {
  apiError,
  ApiError,
  rateLimitError,
  requireSession,
} from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  normalizePlan,
  roleHasPermission,
  scanCapsForPlan,
} from "@/lib/entitlements";
import {
  audit,
  clearScanResultCollections,
  countInflightScans,
  deletePageJobs,
  getScanJob,
  getWorkspace,
  reserveScanQuota,
  updateScanJob,
} from "@/lib/data/firestore";
import { isScanWorkerHeartbeatStale } from "@/lib/data/scan-lifecycle";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "create_scans")) {
      throw new ApiError(403, "forbidden");
    }
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job) throw new ApiError(404, "not_found");
    const retryableRunning = job.status === "running" && isScanWorkerHeartbeatStale(job);
    if (job.status !== "failed" && job.progressStep !== "queue_retry_pending" && !retryableRunning) {
      throw new ApiError(409, "not_retryable", `Scan cannot be retried from ${job.status}.`);
    }
    const rl = await checkRateLimit("scanCreate", ctx.userId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining, "Too many scans started recently.");

    const workspace = await getWorkspace(ctx.workspaceId);
    if (!workspace) throw new ApiError(404, "workspace_not_found");
    const plan = normalizePlan(workspace.plan);
    const caps = scanCapsForPlan(plan);
    const maxPages = Math.min(job.maxPages, caps.maxPagesCap);
    const maxConcurrent = Number(
      process.env.MAX_CONCURRENT_SCANS_PER_WORKSPACE ?? 1
    );
    if ((await countInflightScans(ctx.workspaceId, id)) >= maxConcurrent) {
      throw new ApiError(
        429,
        "scan_concurrency_limit",
        "A scan is already running. Wait for it to finish."
      );
    }

    let reserved: Awaited<ReturnType<typeof reserveScanQuota>>;
    try {
      reserved = await reserveScanQuota({
        workspaceId: ctx.workspaceId,
        plan,
        maxPages,
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith("daily_workspace_capacity_reached")) {
        throw new ApiError(
          429,
          "daily_scan_limit",
          "Daily free workspace capacity reached."
        );
      }
      if (msg.startsWith("daily_free_capacity_reached")) {
        throw new ApiError(
          429,
          "daily_free_capacity_reached",
          "Daily free capacity reached. Please try again tomorrow."
        );
      }
      throw err;
    }

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
      maxPages: reserved.maxPages,
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
