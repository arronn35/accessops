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
    if (!evidence?.imageDataBase64) throw new ApiError(404, "not_found");
    return new Response(Buffer.from(evidence.imageDataBase64, "base64"), {
      headers: {
        "content-type": evidence.imageContentType ?? "image/png",
        "cache-control": "private, max-age=300",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
