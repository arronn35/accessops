/**
 * GET /api/reports/:id — fetch report metadata
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const [row] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    if (!row || row.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }
    return Response.json({ report: row });
  } catch (err) {
    return apiError(err);
  }
}
