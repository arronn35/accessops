import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getVisualEvidence, softDeleteVisualEvidence } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const evidence = await getVisualEvidence(ctx.workspaceId, id);
    if (!evidence) throw new ApiError(404, "not_found");
    return Response.json({
      evidence: {
        id: evidence.id,
        screenshotStatus: evidence.screenshotStatus,
        selector: evidence.selector,
        viewport: evidence.viewportJson ?? null,
        state: evidence.state,
        boundingBox: evidence.boundingBoxJson ?? null,
        redactionApplied: evidence.redactionApplied,
        failureReason: evidence.failureReason,
        expiresAt: evidence.expiresAt,
        imageUrl: evidence.imageDataBase64 ? `/api/visual-evidence/${evidence.id}/image` : null,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

/** Soft-delete one evidence record: image bytes are removed immediately. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "manage_privacy")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const deleted = await softDeleteVisualEvidence(ctx.workspaceId, id);
    if (!deleted) throw new ApiError(404, "not_found");
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "visual_evidence.deleted",
      resourceType: "visual_evidence",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
