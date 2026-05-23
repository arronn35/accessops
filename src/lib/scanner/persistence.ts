import { eq, sql } from "drizzle-orm";
import {
  accessibilityIssues,
  auditLogs,
  db,
  scanJobs,
  scanPages,
  scanSummaries,
  usageLimits,
} from "@/lib/db";
import type { NormalizedIssue, NormalizedPage, ScanOutcome } from "./types";
import { calculateScanScore } from "./scoring";

export async function persistScanOutcome(
  scanJobId: string,
  pages: NormalizedPage[]
): Promise<void> {
  for (const p of pages) {
    const [pageRow] = await db
      .insert(scanPages)
      .values({
        scanJobId,
        url: p.url,
        title: p.title,
        statusCode: p.statusCode,
        scannedAt: p.scannedAt,
        screenshotPath: p.screenshotPath,
        rawMetadataJson: p.rawMetadata,
      })
      .returning({ id: scanPages.id });

    if (!p.issues.length) continue;

    await db.insert(accessibilityIssues).values(
      p.issues.map((i: NormalizedIssue) => ({
        scanJobId,
        scanPageId: pageRow.id,
        ruleId: i.ruleId,
        impact: i.impact,
        severity: i.severity,
        wcagTagsJson: i.wcagTags,
        description: i.description,
        help: i.help,
        helpUrl: i.helpUrl,
        targetJson: i.target,
        contextsJson: i.contexts,
        htmlSnippet: i.htmlSnippet,
        failureSummary: i.failureSummary,
        humanReviewRequired: i.humanReviewRequired,
      }))
    );
  }
}

export async function markScanFailed(scanJobId: string, errorMessage: string) {
  await db
    .update(scanJobs)
    .set({
      status: "failed",
      progressStep: "failed",
      errorMessage,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, scanJobId));
}

export async function completeScanJob(
  scanJobId: string,
  outcome: ScanOutcome,
  metadata: {
    userId: string;
    workspaceId: string;
  }
) {
  const summary = calculateScanScore(outcome.pages);

  await db
    .insert(scanSummaries)
    .values({
      scanJobId,
      overallScore: summary.overallScore,
      grade: summary.grade,
      riskLevel: summary.riskLevel,
      issueCountsJson: summary.issueCounts,
      categoryScoresJson: summary.categoryScores,
      pageScoresJson: summary.pageScores,
      wcagIssueCount: summary.wcagIssueCount,
      bestPracticeIssueCount: summary.bestPracticeIssueCount,
      manualReviewCount: summary.manualReviewCount,
      scoringVersion: summary.scoringVersion,
    })
    .onConflictDoUpdate({
      target: scanSummaries.scanJobId,
      set: {
        overallScore: summary.overallScore,
        grade: summary.grade,
        riskLevel: summary.riskLevel,
        issueCountsJson: summary.issueCounts,
        categoryScoresJson: summary.categoryScores,
        pageScoresJson: summary.pageScores,
        wcagIssueCount: summary.wcagIssueCount,
        bestPracticeIssueCount: summary.bestPracticeIssueCount,
        manualReviewCount: summary.manualReviewCount,
        scoringVersion: summary.scoringVersion,
      },
    });

  await db
    .update(scanJobs)
    .set({
      status: "completed",
      progressStep: "completed",
      pagesScanned: outcome.pagesScanned,
      pagesDiscovered: outcome.pagesDiscovered,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, scanJobId));

  await db
    .update(usageLimits)
    .set({
      pagesScannedThisMonth: sql`${usageLimits.pagesScannedThisMonth} + ${outcome.pagesScanned}`,
    })
    .where(eq(usageLimits.workspaceId, metadata.workspaceId));

  await db.insert(auditLogs).values({
    userId: metadata.userId,
    workspaceId: metadata.workspaceId,
    action: "scan.completed",
    resourceType: "scan_job",
    resourceId: scanJobId,
    metadataJson: {
      pagesScanned: outcome.pagesScanned,
      durationMs: outcome.durationMs,
    },
  });
}
