import { NextRequest } from "next/server";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { getReport } from "@/lib/data/firestore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const report = await getReport(ctx.workspaceId, id);
    if (!report) throw new ApiError(404, "not_found");
    return Response.json({ report });
  } catch (err) {
    return apiError(err);
  }
}
