import { createHash } from "node:crypto";
import {
  audit,
  clearScanPageResult,
  clearScanGroups,
  clearScanResultCollections,
  getScanJob,
  incrementPagesUsage,
  listIssues,
  listScanPages,
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
import type { AccessibilityIssue, ScanPage, ScanPhase } from "@/lib/data/types";
import { terminalScanPhase } from "@/lib/data/page-jobs";
import type {
  Impact,
  NormalizedIssue,
  NormalizedPage,
  ScanOutcome,
  ScannerPageMetadata,
  Severity,
} from "./types";
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

/**
 * Persist one page's row + its issues (and visual evidence). Shared by the
 * legacy whole-scan path and the per-page job path. Returns the groupables for
 * the issues written, plus how many issues were persisted (against the budget).
 */
async function persistPageRows(
  scanJobId: string,
  page: NormalizedPage,
  options: { workspaceId: string; storeScreenshots?: boolean; retentionDays?: number },
  remainingIssueBudget: number,
  pageJobId?: string
): Promise<{ groupables: GroupableIssue[]; persisted: number }> {
  const pageRow = await writeScanPage(options.workspaceId, scanJobId, {
    scanJobId,
    url: page.url,
    title: page.title,
    statusCode: page.statusCode,
    scannedAt: page.scannedAt,
    screenshotPath: null,
    rawMetadataJson: {
      ...(typeof page.rawMetadata === "object" && page.rawMetadata ? page.rawMetadata : {}),
      engineLabel: engineLabelFor(pageEngine(page)),
    },
  }, pageJobId);

  const groupables: GroupableIssue[] = [];
  let persisted = 0;
  for (const [issueIndex, i] of page.issues.entries()) {
    if (persisted >= remainingIssueBudget) break;
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
    }, pageJobId ? deterministicIssueId(pageJobId, issueIndex, i) : undefined);
    if (i.visualEvidence) {
      await persistVisualEvidence(options.workspaceId, scanJobId, pageRow.id, issueRow.id, i, options);
    }
    persisted += 1;
    groupables.push(toGroupable(issueRow.id, i));
  }
  return { groupables, persisted };
}

export async function persistScanOutcome(
  scanJobId: string,
  pages: NormalizedPage[],
  options: { workspaceId: string; storeScreenshots?: boolean; retentionDays?: number }
): Promise<void> {
  const grouping: GroupableIssue[] = [];
  let persistedIssues = 0;
  const cap = maxPersistedIssuesPerScan();

  await clearScanResultCollections(options.workspaceId, scanJobId);

  for (const p of pages) {
    const { groupables, persisted } = await persistPageRows(
      scanJobId,
      p,
      options,
      Math.max(0, cap - persistedIssues)
    );
    persistedIssues += persisted;
    grouping.push(...groupables);
  }

  await persistIssueGroups(options.workspaceId, scanJobId, grouping);
}

/**
 * Per-page job path: persist ONE page's results as it completes. No collection
 * clear and no grouping — those happen once in `aggregateScan` after every
 * page is terminal. Issue budget is applied per page in this model.
 */
export async function persistPageResult(
  scanJobId: string,
  page: NormalizedPage,
  options: {
    workspaceId: string;
    storeScreenshots?: boolean;
    retentionDays?: number;
    pageJobId: string;
  }
): Promise<void> {
  await clearScanPageResult(options.workspaceId, scanJobId, options.pageJobId);
  await persistPageRows(
    scanJobId,
    page,
    options,
    maxPersistedIssuesPerScan(),
    options.pageJobId
  );
}

function deterministicIssueId(
  pageJobId: string,
  issueIndex: number,
  issue: NormalizedIssue
): string {
  const fingerprint = JSON.stringify([
    pageJobId,
    issueIndex,
    issue.ruleId,
    issue.target ?? [],
    issue.contexts ?? [],
  ]);
  return createHash("sha256").update(fingerprint).digest("hex").slice(0, 32);
}

function storedIssueToNormalized(i: AccessibilityIssue): NormalizedIssue {
  return {
    ruleId: i.ruleId,
    impact: i.impact as Impact,
    severity: i.severity as Severity,
    wcagTags: i.wcagTagsJson ?? [],
    description: i.description,
    help: i.help,
    helpUrl: i.helpUrl ?? undefined,
    target: i.targetJson ?? [],
    htmlSnippet: i.htmlSnippet ?? undefined,
    failureSummary: i.failureSummary ?? undefined,
    humanReviewRequired: i.humanReviewRequired,
    contexts: i.contextsJson ?? undefined,
  };
}

function storedPagesToNormalized(
  pages: ScanPage[],
  issues: AccessibilityIssue[]
): NormalizedPage[] {
  const byPage = new Map<string, AccessibilityIssue[]>();
  for (const i of issues) {
    const key = i.scanPageId ?? "";
    const list = byPage.get(key);
    if (list) list.push(i);
    else byPage.set(key, [i]);
  }
  return pages.map((p) => ({
    url: p.url,
    title: p.title,
    statusCode: p.statusCode,
    scannedAt: p.scannedAt ?? new Date(0),
    rawMetadata: (p.rawMetadataJson as ScannerPageMetadata | undefined) ?? undefined,
    issues: (byPage.get(p.id) ?? []).map(storedIssueToNormalized),
  }));
}

/**
 * Aggregate a fully-scanned (per-page) scan: read every stored page + issue,
 * score and group them, generate remediation tasks, and set the terminal
 * state. Idempotent — safe to re-run if an aggregator crashed mid-flight.
 */
export async function aggregateScan(
  scanJobId: string,
  meta: { workspaceId: string; userId: string }
): Promise<{ phase: ScanPhase; pagesDone: number; pagesFailed: number }> {
  const { workspaceId } = meta;
  const scan = await getScanJob(workspaceId, scanJobId);
  const pages = await listScanPages(workspaceId, scanJobId);
  const issues = await listIssues(workspaceId, scanJobId);
  const normalized = storedPagesToNormalized(pages, issues);

  const summary = calculateScanScore(normalized);
  await writeScanSummary(workspaceId, scanJobId, {
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

  // Re-group from scratch so a re-run does not duplicate group docs.
  await clearScanGroups(workspaceId, scanJobId);
  await persistIssueGroups(
    workspaceId,
    scanJobId,
    issues.map((i) => toGroupable(i.id, storedIssueToNormalized(i)))
  );

  const pagesFailed = scan?.pagesFailed ?? 0;
  const pagesDone = scan?.pagesDone ?? pages.length;
  const phase: ScanPhase = terminalScanPhase(pagesDone, pagesFailed);
  const allFailed = phase === "failed";
  const at = new Date();

  await updateScanJob(workspaceId, scanJobId, {
    status: allFailed ? "failed" : "completed",
    phase,
    progressStep: allFailed ? "failed" : "completed",
    currentStep: phase,
    currentUrl: null,
    currentState: null,
    pagesScanned: pagesDone,
    claimedBy: null,
    processorStartedAt: null,
    processorHeartbeatAt: at,
    completedAt: at,
    lastProgressAt: at,
    errorMessage: allFailed
      ? "All pages failed to scan."
      : pagesFailed > 0
      ? `${pagesFailed} page${pagesFailed === 1 ? "" : "s"} could not be scanned.`
      : null,
    errorCode: allFailed ? "all_pages_failed" : null,
    timings: { finishedAt: at },
  });

  if (!allFailed) {
    await syncRemediationTasksForScan(workspaceId, scanJobId);
    await incrementPagesUsage(workspaceId, pagesDone);
  }

  const engine =
    normalized.map(pageEngine).find((value) => value) ?? "playwright-axe";
  await audit({
    userId: meta.userId,
    workspaceId,
    action: allFailed ? "scan.failed" : "scan.completed",
    resourceType: "scan_job",
    resourceId: scanJobId,
    metadata: {
      pagesScanned: pagesDone,
      pagesFailed,
      engine,
      phase,
      remediationTasksCreated: allFailed ? 0 : undefined,
    },
  });

  return { phase, pagesDone, pagesFailed };
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
