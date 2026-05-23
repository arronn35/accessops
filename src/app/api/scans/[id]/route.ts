/**
 * GET /api/scans/:id — full scan summary (job + page counts + severity counts)
 */
import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  scanJobs,
  scanPages,
  accessibilityIssues,
  scanSummaries,
} from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;

    const [job] = await db
      .select()
      .from(scanJobs)
      .where(and(eq(scanJobs.id, id), eq(scanJobs.workspaceId, ctx.workspaceId)))
      .limit(1);

    if (!job) throw new ApiError(404, "not_found");

    const pagesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scanPages)
      .where(eq(scanPages.scanJobId, id));

    const severity = await db
      .select({
        severity: accessibilityIssues.severity,
        count: sql<number>`count(*)::int`,
      })
      .from(accessibilityIssues)
      .where(eq(accessibilityIssues.scanJobId, id))
      .groupBy(accessibilityIssues.severity);

    const impact = await db
      .select({
        impact: accessibilityIssues.impact,
        count: sql<number>`count(*)::int`,
      })
      .from(accessibilityIssues)
      .where(eq(accessibilityIssues.scanJobId, id))
      .groupBy(accessibilityIssues.impact);

    const [summary] = await db
      .select()
      .from(scanSummaries)
      .where(eq(scanSummaries.scanJobId, id))
      .limit(1);

    const counts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 0,
      review: 0,
    } as Record<string, number>;
    for (const row of severity) counts[row.severity] = row.count;
    for (const row of impact) {
      if (row.impact === "serious") counts.serious = row.count;
    }

    return Response.json({
      scan: job,
      pagesCount: pagesCount[0]?.count ?? 0,
      counts,
      scoreSummary: summary
        ? {
            overallScore: summary.overallScore,
            grade: summary.grade,
            riskLevel: summary.riskLevel,
            issueCounts: summary.issueCountsJson,
            wcagIssueCount: summary.wcagIssueCount,
            bestPracticeIssueCount: summary.bestPracticeIssueCount,
            manualReviewCount: summary.manualReviewCount,
            categoryScores: summary.categoryScoresJson,
            pageScores: summary.pageScoresJson,
            scoringVersion: summary.scoringVersion,
            createdAt: summary.createdAt,
          }
        : null,
    });
  } catch (err) {
    return apiError(err);
  }
}
