import { eq, sql } from "drizzle-orm";
import {
  accessibilityIssues,
  auditLogs,
  db,
  scanJobs,
  scanPages,
  scanSummaries,
  usageLimits,
  visualEvidence,
} from "@/lib/db";
import type { NormalizedIssue, NormalizedPage, ScanOutcome, VisualEvidenceMetadata } from "./types";
import { calculateScanScore } from "./scoring";
import {
  putVisualEvidenceObject,
  visualEvidenceStorageAvailable,
} from "@/lib/storage/r2";

export async function persistScanOutcome(
  scanJobId: string,
  pages: NormalizedPage[],
  options?: { workspaceId: string; storeScreenshots: boolean; retentionDays: number }
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

    for (const i of p.issues) {
      const [issueRow] = await db.insert(accessibilityIssues).values({
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
      }).returning({ id: accessibilityIssues.id });

      if (i.visualEvidence && options) {
        await persistVisualEvidenceForIssue({
          workspaceId: options.workspaceId,
          scanJobId,
          scanPageId: pageRow.id,
          issueId: issueRow.id,
          evidence: i.visualEvidence,
          storeScreenshots: options.storeScreenshots,
          retentionDays: options.retentionDays,
        });
      }
    }
  }
}

export async function persistVisualEvidenceForIssue(args: {
  workspaceId: string;
  scanJobId: string;
  scanPageId: string;
  issueId: string;
  evidence: VisualEvidenceMetadata;
  storeScreenshots: boolean;
  retentionDays: number;
}): Promise<void> {
  const expiresAt = new Date(
    Date.now() + Math.max(1, args.retentionDays) * 24 * 60 * 60 * 1000
  );
  let screenshotKey = args.evidence.screenshotKey;
  let status = args.evidence.screenshotStatus;
  let failureReason = args.evidence.screenshotFailureReason;

  if (
    args.evidence.imageBuffer &&
    (status === "captured" || status === "redacted")
  ) {
    if (args.storeScreenshots && visualEvidenceStorageAvailable()) {
      screenshotKey = `visual-evidence/${args.workspaceId}/${args.scanJobId}/${args.issueId}.png`;
      try {
        await putVisualEvidenceObject({
          key: screenshotKey,
          body: args.evidence.imageBuffer,
          contentType: "image/png",
        });
      } catch (err) {
        screenshotKey = undefined;
        status = "failed";
        failureReason = `storage_failed:${(err as Error).message}`;
      }
    } else {
      screenshotKey = undefined;
      status = "skipped";
      failureReason = args.storeScreenshots
        ? "storage_disabled"
        : "screenshot_storage_disabled";
    }
  }

  await db.insert(visualEvidence).values({
    workspaceId: args.workspaceId,
    scanJobId: args.scanJobId,
    scanPageId: args.scanPageId,
    issueId: args.issueId,
    screenshotKey,
    screenshotStatus: status,
    selector: args.evidence.selector,
    viewportJson: args.evidence.viewport,
    state: args.evidence.state,
    boundingBoxJson: args.evidence.boundingBox,
    redactionApplied: args.evidence.redactionApplied,
    failureReason,
    expiresAt,
  });
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
