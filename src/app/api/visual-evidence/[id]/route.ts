import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { getVisualEvidence } from "@/lib/data/firestore";

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

export async function DELETE() {
  return Response.json({ ok: false, error: "delete_not_supported" }, { status: 501 });
}
