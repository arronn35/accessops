import { NextRequest } from "next/server";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getScanJob, getScanSummary, listIssues, listScanPages } from "@/lib/data/firestore";
import { deleteScanCompletely } from "@/lib/data/deletion";
import { roleHasPermission } from "@/lib/entitlements";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_scans")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job) throw new ApiError(404, "not_found");
    const [pages, issues, summary] = await Promise.all([
      listScanPages(ctx.workspaceId, id),
      listIssues(ctx.workspaceId, id),
      getScanSummary(ctx.workspaceId, id),
    ]);
    const counts = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      passed: 0,
      review: 0,
    };
    for (const issue of issues) {
      if (issue.impact === "serious") counts.serious++;
      counts[issue.severity]++;
    }
    return Response.json({
      scan: job,
      pagesCount: pages.length,
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
            pagesFailedToScan: summary.pagesFailedToScan ?? 0,
            failedPageUrls: summary.failedPageUrls ?? [],
            scoringVersion: summary.scoringVersion,
            createdAt: summary.createdAt,
          }
        : null,
    });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * Permanently delete one scan and its results (pages, issues, groups,
 * summary, visual evidence). Running scans must finish or fail first so the
 * worker does not resurrect partial results.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "delete_scans")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job) throw new ApiError(404, "not_found");
    if (job.status === "queued" || job.status === "running") {
      throw new ApiError(409, "scan_in_progress", "Wait for the scan to finish before deleting it.");
    }
    const deletedCounts = await deleteScanCompletely(ctx.workspaceId, id);
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "scan.deleted",
      resourceType: "scan",
      resourceId: id,
      metadata: { deletedCounts },
    });
    return Response.json({ ok: true, deletedCounts });
  } catch (err) {
    return apiError(err);
  }
}
