import { apiError, requireSession } from "@/lib/api/context";
import { getVisualEvidenceForIssue } from "@/lib/data/firestore";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const evidence = await getVisualEvidenceForIssue(ctx.workspaceId, id);
    return Response.json({
      evidence: evidence
        ? {
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
          }
        : null,
    });
  } catch (err) {
    return apiError(err);
  }
}
