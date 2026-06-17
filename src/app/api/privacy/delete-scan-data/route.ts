import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { audit } from "@/lib/data/firestore";
import {
  createDataDeletionJob,
  getLatestDataDeletionJob,
} from "@/lib/data/deletion";
import type { DataDeletionJob } from "@/lib/data/types";

const DeleteSchema = z.object({
  confirm: z.literal("DELETE"),
});

function jobResponse(job: DataDeletionJob) {
  return {
    id: job.id,
    status: job.status,
    requestedAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    deletedCounts: job.deletedCounts,
    verifiedAt: job.verifiedAt,
    error: job.error,
  };
}

/**
 * Queue asynchronous deletion of all scan data in the workspace. The
 * browser worker executes the job; poll GET on this route for progress.
 * Responds 202 — deletion has NOT happened yet when this returns.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("delete_scans");
    const parsed = DeleteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError(400, "confirmation_required", 'Send { "confirm": "DELETE" } to queue deletion.');
    }

    const { job, created } = await createDataDeletionJob({
      workspaceId: ctx.workspaceId,
      requestedBy: ctx.userId,
    });
    if (created) {
      await audit({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        action: "privacy.scan_data_deletion_requested",
        resourceType: "deletion_job",
        resourceId: job.id,
      });
    }
    return Response.json(
      { ok: true, job: jobResponse(job) },
      { status: 202, headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return apiError(err);
  }
}

/** Status of the most recent deletion job for the workspace. */
export async function GET() {
  try {
    const ctx = await requirePermission("delete_scans");
    const job = await getLatestDataDeletionJob(ctx.workspaceId);
    return Response.json(
      { ok: true, job: job ? jobResponse(job) : null },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return apiError(err);
  }
}
