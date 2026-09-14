/**
 * Guided manual-audit records for one scan.
 *
 * GET  — every recorded verdict, for the reviewer UI and the report.
 * PUT  — record one reviewer's verdict on one check.
 *
 * Reading follows view_scans like the rest of the scan surface. Writing needs
 * manage_manual_review, which auditors hold and client/report viewers do not.
 * The reviewer identity is taken from the session, never from the body: a
 * review is evidence about who checked what, so a caller must not be able to
 * attribute their verdict to someone else.
 */
import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import {
  audit,
  getScanJob,
  getUser,
  listManualReviews,
  upsertManualReview,
} from "@/lib/data/firestore";
import { manualCheckById } from "@/lib/compliance/manual-checks";

const Body = z.object({
  checkId: z.string().min(1).max(64),
  status: z.enum(["pending", "passed", "failed"]),
  notes: z.string().max(4000).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("view_scans");
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job || job.deletionStartedAt) throw new ApiError(404, "not_found");
    return Response.json({ reviews: await listManualReviews(ctx.workspaceId, id) });
  } catch (err) {
    if (err instanceof Error && err.message === "scan_unavailable_for_review") return apiError(new ApiError(409, "scan_unavailable_for_review"));
    return apiError(err);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("manage_manual_review");
    const { id } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    // Only checks we actually define may be recorded, so the report cannot end
    // up citing a criterion nobody wrote a check for.
    const check = manualCheckById(parsed.data.checkId);
    if (!check) throw new ApiError(400, "unknown_check");

    const job = await getScanJob(ctx.workspaceId, id);
    if (!job || job.deletionStartedAt) throw new ApiError(404, "not_found");

    const user = await getUser(ctx.userId);
    const review = await upsertManualReview(ctx.workspaceId, id, {
      checkId: check.id,
      status: parsed.data.status,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      wcagCriteria: check.wcagCriteria,
      reviewerUserId: ctx.userId,
      reviewerName: user?.name ?? user?.fullName ?? null,
      reviewerEmail: user?.email ?? null,
    });

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "manual_review.recorded",
      resourceType: "scan",
      resourceId: id,
      metadata: { checkId: check.id, status: review.status, revision: review.revision },
    });

    return Response.json({ review });
  } catch (err) {
    if (err instanceof Error && err.message === "scan_unavailable_for_review") return apiError(new ApiError(409, "scan_unavailable_for_review"));
    return apiError(err);
  }
}
