/**
 * GET /api/scans/:id/compare?against=<scanId>
 *
 * Diffs the scan `:id` (the "after") against an earlier scan (the
 * "before") of the same base URL, by root-cause group. When `against`
 * is omitted we auto-select the most recent *completed* prior scan of
 * the same base URL in the workspace, so "Re-run & compare" works with a
 * single click.
 *
 * Both scans must belong to the caller's workspace and share a base URL —
 * comparing different sites is meaningless and we reject it with 422.
 */
import { NextRequest } from "next/server";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { resolveComparison, ComparisonError } from "@/lib/server/compare";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const againstId = req.nextUrl.searchParams.get("against");

    let result;
    try {
      result = await resolveComparison(id, againstId, ctx.workspaceId);
    } catch (err) {
      if (err instanceof ComparisonError) {
        const status = err.code === "base_url_mismatch" ? 422 : 404;
        throw new ApiError(status, err.code, err.message);
      }
      throw err;
    }

    if (!result.comparable) {
      return Response.json({
        comparable: false,
        reason: result.reason,
        message:
          "No earlier completed scan of this URL was found to compare against.",
        after: scanRef(result.after),
      });
    }

    return Response.json({
      comparable: true,
      before: scanRef(result.before),
      after: scanRef(result.after),
      comparison: result.comparison,
    });
  } catch (err) {
    return apiError(err);
  }
}

function scanRef(s: {
  id: string;
  baseUrl: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  score: unknown;
}) {
  return {
    id: s.id,
    baseUrl: s.baseUrl,
    status: s.status,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
    score: s.score,
  };
}
