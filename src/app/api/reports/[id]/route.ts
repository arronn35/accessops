import { NextRequest } from "next/server";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { getReport } from "@/lib/data/firestore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("view_scans");
    const { id } = await params;
    const report = await getReport(ctx.workspaceId, id);
    if (!report) throw new ApiError(404, "not_found");
    return Response.json({ report });
  } catch (err) {
    return apiError(err);
  }
}
