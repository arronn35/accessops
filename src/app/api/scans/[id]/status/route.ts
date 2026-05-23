/**
 * GET /api/scans/:id/status — lightweight polling endpoint used by
 * the Scan Progress UI. Returns only the fields needed to render the
 * timeline so we don't push a heavy payload every few seconds.
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scanJobs } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const [job] = await db
      .select({
        id: scanJobs.id,
        status: scanJobs.status,
        progressStep: scanJobs.progressStep,
        pagesScanned: scanJobs.pagesScanned,
        pagesDiscovered: scanJobs.pagesDiscovered,
        startedAt: scanJobs.startedAt,
        completedAt: scanJobs.completedAt,
        errorMessage: scanJobs.errorMessage,
      })
      .from(scanJobs)
      .where(and(eq(scanJobs.id, id), eq(scanJobs.workspaceId, ctx.workspaceId)))
      .limit(1);

    if (!job) throw new ApiError(404, "not_found");
    return Response.json(job, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    return apiError(err);
  }
}
