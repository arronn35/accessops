import {
  audit,
  clearScanResultCollections,
  incrementPagesUsage,
  maxPersistedIssuesPerScan,
  syncRemediationTasksForScan,
  updateIssueGroupId,
  updateScanJob,
  writeIssue,
  writeIssueGroup,
  writeScanPage,
  writeScanSummary,
  writeVisualEvidence,
} from "@/lib/data/firestore";
import type { NormalizedIssue, NormalizedPage, ScanOutcome } from "./types";
import { calculateScanScore } from "./scoring";
import { groupIssues, type GroupableIssue } from "./grouping";

const MAX_FIRESTORE_SCREENSHOT_BYTES = 650_000;

/** Human-readable label derived from the engine that produced a page. */
function engineLabelFor(engine: unknown): string {
  if (engine === "playwright-axe") return "browser scan (axe-core)";
  if (engine === "static-html-fallback") return "static scan";
  return "scan";
}

function pageEngine(page: NormalizedPage): string | undefined {
  const raw = page.rawMetadata;
  const engine = raw && typeof raw === "object" ? (raw as Record<string, unknown>).engine : undefined;
  return typeof engine === "string" ? engine : undefined;
}

export async function persistScanOutcome(
  scanJobId: string,
  pages: NormalizedPage[],
  options: { workspaceId: string; storeScreenshots?: boolean; retentionDays?: number }
): Promise<void> {
  const grouping: GroupableIssue[] = [];
  let persistedIssues = 0;

  await clearScanResultCollections(options.workspaceId, scanJobId);

  for (const p of pages) {
    const pageRow = await writeScanPage(options.workspaceId, scanJobId, {
      scanJobId,
      url: p.url,
      title: p.title,
      statusCode: p.statusCode,
      scannedAt: p.scannedAt,
      screenshotPath: null,
      rawMetadataJson: {
        ...(typeof p.rawMetadata === "object" && p.rawMetadata ? p.rawMetadata : {}),
        engineLabel: engineLabelFor(pageEngine(p)),
      },
    });

    for (const i of p.issues) {
      if (persistedIssues >= maxPersistedIssuesPerScan()) break;
      const issueRow = await writeIssue(options.workspaceId, scanJobId, {
        scanJobId,
        scanPageId: pageRow.id,
        groupId: null,
        ruleId: i.ruleId,
        impact: i.impact,
        severity: i.severity,
        wcagTagsJson: i.wcagTags,
        description: i.description,
        help: i.help,
        helpUrl: i.helpUrl ?? null,
        targetJson: i.target ?? null,
        contextsJson: i.contexts ?? null,
        htmlSnippet: i.htmlSnippet ?? null,
        failureSummary: i.failureSummary ?? null,
        humanReviewRequired: i.humanReviewRequired,
        falsePositive: false,
        status: "to_review",
      });
      if (i.visualEvidence) {
        await persistVisualEvidence(options.workspaceId, scanJobId, pageRow.id, issueRow.id, i, options);
      }
      persistedIssues++;
      grouping.push(toGroupable(issueRow.id, i));
    }
  }

  await persistIssueGroups(options.workspaceId, scanJobId, grouping);
}

async function persistVisualEvidence(
  workspaceId: string,
  scanJobId: string,
  scanPageId: string,
  issueId: string,
  issue: NormalizedIssue,
  options: { storeScreenshots?: boolean; retentionDays?: number }
) {
  const evidence = issue.visualEvidence;
  if (!evidence) return;

  const canStoreImage =
    options.storeScreenshots &&
    evidence.imageBuffer &&
    evidence.imageBuffer.byteLength <= MAX_FIRESTORE_SCREENSHOT_BYTES &&
    (evidence.screenshotStatus === "captured" || evidence.screenshotStatus === "redacted");
  const imageTooLarge =
    options.storeScreenshots &&
    evidence.imageBuffer &&
    evidence.imageBuffer.byteLength > MAX_FIRESTORE_SCREENSHOT_BYTES;
  const expiresAt = new Date(
    Date.now() + Math.max(1, options.retentionDays ?? 30) * 24 * 60 * 60 * 1000
  );

  await writeVisualEvidence({
    workspaceId,
    scanJobId,
    scanPageId,
    issueId,
    screenshotKey: canStoreImage ? `firestore:${issueId}` : null,
    imageDataBase64: canStoreImage ? evidence.imageBuffer!.toString("base64") : null,
    imageContentType: canStoreImage ? "image/png" : null,
    screenshotStatus: imageTooLarge ? "failed" : evidence.screenshotStatus,
    selector: evidence.selector ?? issue.target?.[0] ?? null,
    viewportJson: evidence.viewport ?? null,
    state: evidence.state ?? null,
    boundingBoxJson: evidence.boundingBox ?? null,
    redactionApplied: evidence.redactionApplied,
    failureReason: imageTooLarge
      ? "screenshot_too_large_for_firestore"
      : evidence.screenshotFailureReason ?? null,
    expiresAt,
  });
}

export function toGroupable(id: string, i: NormalizedIssue): GroupableIssue {
  return {
    id,
    ruleId: i.ruleId,
    severity: i.severity,
    wcagTags: i.wcagTags,
    help: i.help,
    description: i.description,
    helpUrl: i.helpUrl ?? null,
    target: i.target ?? null,
    failureSummary: i.failureSummary ?? null,
    humanReviewRequired: i.humanReviewRequired,
  };
}

export async function persistIssueGroups(
  workspaceId: string,
  scanJobId: string,
  issues: GroupableIssue[]
): Promise<void> {
  if (!issues.length) return;
  const { groups } = groupIssues(issues);
  for (const g of groups) {
    const row = await writeIssueGroup(workspaceId, scanJobId, {
      scanJobId,
      rootCauseKey: g.rootCauseKey,
      ruleId: g.ruleId,
      title: g.title,
      severity: g.severity,
      affectedCount: g.affectedCount,
      primaryWcagTag: g.primaryWcagTag,
      summary: g.summary,
      recommendedFix: g.recommendedFix,
      priority: g.priority,
    });
    await updateIssueGroupId(workspaceId, scanJobId, g.issueIds, row.id);
  }
}

export async function markScanFailed(
  workspaceId: string,
  scanJobId: string,
  errorMessage: string
) {
  await updateScanJob(workspaceId, scanJobId, {
    status: "failed",
    progressStep: "failed",
    errorMessage,
    completedAt: new Date(),
  });
}

export async function completeScanJob(
  scanJobId: string,
  outcome: ScanOutcome,
  metadata: {
    userId: string;
    workspaceId: string;
  }
) {
  const engine =
    outcome.pages.map(pageEngine).find((value) => value) ?? "playwright-axe";
  const summary = calculateScanScore(outcome.pages);
  await writeScanSummary(metadata.workspaceId, scanJobId, {
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
  });

  await updateScanJob(metadata.workspaceId, scanJobId, {
    status: "completed",
    progressStep: "completed",
    pagesScanned: outcome.pagesScanned,
    pagesDiscovered: outcome.pagesDiscovered,
    completedAt: new Date(),
  });
  const remediationTasksCreated = await syncRemediationTasksForScan(
    metadata.workspaceId,
    scanJobId
  );
  await incrementPagesUsage(metadata.workspaceId, outcome.pagesScanned);
  await audit({
    userId: metadata.userId,
    workspaceId: metadata.workspaceId,
    action: "scan.completed",
    resourceType: "scan_job",
    resourceId: scanJobId,
    metadata: {
      pagesScanned: outcome.pagesScanned,
      durationMs: outcome.durationMs,
      engine,
      remediationTasksCreated,
    },
  });
}
