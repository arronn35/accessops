/**
 * GET /api/scans/:id/issues — full issues list for a scan, with the
 * minimum joined data the UI needs (page URL + title).
 */
import { NextRequest } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accessibilityIssues,
  scanJobs,
  scanPages,
} from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  moderate: 1,
  review: 2,
  minor: 3,
  passed: 4,
};
const SEVERITIES = new Set(Object.keys(SEVERITY_RANK));

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;

    const [job] = await db
      .select({ id: scanJobs.id })
      .from(scanJobs)
      .where(and(eq(scanJobs.id, id), eq(scanJobs.workspaceId, ctx.workspaceId)))
      .limit(1);
    if (!job) throw new ApiError(404, "not_found");

    const rows = await db
      .select({
        id: accessibilityIssues.id,
        ruleId: accessibilityIssues.ruleId,
        impact: accessibilityIssues.impact,
        severity: accessibilityIssues.severity,
        wcagTagsJson: accessibilityIssues.wcagTagsJson,
        description: accessibilityIssues.description,
        help: accessibilityIssues.help,
        helpUrl: accessibilityIssues.helpUrl,
        targetJson: accessibilityIssues.targetJson,
        contextsJson: accessibilityIssues.contextsJson,
        htmlSnippet: accessibilityIssues.htmlSnippet,
        humanReviewRequired: accessibilityIssues.humanReviewRequired,
        status: accessibilityIssues.status,
        pageUrl: scanPages.url,
        pageTitle: scanPages.title,
      })
      .from(accessibilityIssues)
      .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
      .where(eq(accessibilityIssues.scanJobId, id))
      .orderBy(asc(accessibilityIssues.severity), desc(accessibilityIssues.createdAt));

    // Stable severity ordering on top of the alphabetical DB sort.
    rows.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

    const severityFilter = req.nextUrl.searchParams.get("severity");
    if (severityFilter && !SEVERITIES.has(severityFilter)) {
      throw new ApiError(400, "invalid_severity");
    }
    const filtered = severityFilter
      ? rows.filter((r) => r.severity === severityFilter)
      : rows;

    return Response.json({ issues: filtered, total: rows.length });
  } catch (err) {
    return apiError(err);
  }
}
