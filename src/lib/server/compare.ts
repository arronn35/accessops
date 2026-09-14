import "server-only";
import {
  getScanJob,
  getScanSummary,
  listIssueGroups,
  listScanPages,
  listPriorComparisonScans,
} from "@/lib/data/firestore";
import {
  compareScans,
  type CompareGroupInput,
  type CompareScopeInput,
  type CompareScoreInput,
  type ScanComparison,
} from "@/lib/scanner/compare";
import { canonicalComparisonUrl, profileMismatchReasons, type ComparisonProfile, type ComparisonReason } from "@/lib/scanner/comparison-profile";

export interface LoadedScan {
  id: string;
  baseUrl: string;
  createdAt: Date;
  completedAt: Date | null;
  status: string;
  groups: CompareGroupInput[];
  score: CompareScoreInput | null;
  /** What this scan actually covered — gates the "fixed" verdict. */
  scope: CompareScopeInput;
  profile: ComparisonProfile | null;
}

export type ComparisonResult =
  | { comparable: false; reason: ComparisonReason; reasons: ComparisonReason[]; verificationStatus: "verification_pending" | "inconclusive"; after: LoadedScan; before?: LoadedScan }
  | { comparable: true; before: LoadedScan; after: LoadedScan; comparison: ScanComparison };

export class ComparisonError extends Error {
  constructor(public readonly code: "not_found" | "comparison_scan_not_found" | "base_url_mismatch", message?: string) {
    super(message ?? code);
    this.name = "ComparisonError";
  }
}

export async function loadScanForComparison(
  scanId: string,
  workspaceId: string
): Promise<LoadedScan | null> {
  const job = await getScanJob(workspaceId, scanId);
  if (!job) return null;
  const [groups, summary, pages] = await Promise.all([
    listIssueGroups(workspaceId, scanId),
    getScanSummary(workspaceId, scanId),
    listScanPages(workspaceId, scanId),
  ]);

  const fingerprintVersion = job.comparisonProfile?.fingerprintVersion ?? null;
  return {
    id: job.id,
    baseUrl: job.baseUrl,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    status: job.status,
    groups: groups.map((g) => ({
      rootCauseKey: g.rootCauseKey,
      ruleId: g.ruleId,
      title: g.title,
      severity: g.severity,
      affectedCount: g.affectedCount,
      primaryWcagTag: g.primaryWcagTag,
      priority: g.priority,
      elementKeys: g.elementKeys ?? [],
    })),
    profile: job.comparisonProfile ?? null,
    scope: {
      profile: job.comparisonProfile ?? null,
      urls: pages.map((p) => canonicalComparisonUrl(p.url)),
      failedPageCount: summary?.pagesFailedToScan ?? job.pagesFailed ?? 0,
      fingerprintVersion,
    },
    score: summary
      ? {
          overallScore: summary.overallScore,
          grade: summary.grade,
          riskLevel: summary.riskLevel,
          manualReviewCount: summary.manualReviewCount,
        }
      : null,
  };
}

export async function resolveComparison(
  scanId: string,
  againstId: string | null,
  workspaceId: string
): Promise<ComparisonResult> {
  const after = await loadScanForComparison(scanId, workspaceId);
  if (!after) throw new ComparisonError("not_found");
  const unavailable = (reasons: ComparisonReason[], before?: LoadedScan): ComparisonResult => ({
    comparable: false, reason: reasons[0], reasons, after, ...(before ? { before } : {}),
    verificationStatus: reasons.some((r) => r === "NEW_SCAN_INCOMPLETE" || r === "OLD_SCAN_INCOMPLETE") ? "verification_pending" : "inconclusive",
  });
  if (after.status !== "completed") return unavailable(["NEW_SCAN_INCOMPLETE"]);
  if (!after.profile?.completeMetadata) return unavailable(["PROFILE_MISSING"]);
  let before: LoadedScan | null = null;
  if (againstId) {
    before = await loadScanForComparison(againstId, workspaceId);
    if (!before) throw new ComparisonError("comparison_scan_not_found");
    if (canonicalComparisonUrl(before.baseUrl) !== canonicalComparisonUrl(after.baseUrl)) throw new ComparisonError("base_url_mismatch");
    if (before.status !== "completed") return unavailable(["OLD_SCAN_INCOMPLETE"], before);
    if (before.id === after.id || before.createdAt >= after.createdAt) return unavailable(["INSUFFICIENT_HISTORY"], before);
  } else {
    let nearest: LoadedScan | null = null;
    for await (const candidate of listPriorComparisonScans(workspaceId, after.baseUrl, after.createdAt)) {
      const loaded = await loadScanForComparison(candidate.id, workspaceId);
      if (!loaded || loaded.status !== "completed" || loaded.id === after.id) continue;
      nearest ??= loaded;
      if (profileMismatchReasons(loaded.profile, after.profile).length === 0) { before = loaded; break; }
    }
    if (!before) {
      return nearest ? unavailable(profileMismatchReasons(nearest.profile, after.profile), nearest) : unavailable(["INSUFFICIENT_HISTORY"]);
    }
  }
  const reasons = profileMismatchReasons(before.profile, after.profile);
  if (reasons.length) return unavailable(reasons, before);
  const comparison = compareScans(
    { groups: before.groups, score: before.score, scope: before.scope },
    { groups: after.groups, score: after.score, scope: after.scope }
  );
  if (comparison.coverage.reasons.length) return unavailable(comparison.coverage.reasons, before);
  // A finding is reopened only with three-scan evidence: observed earlier,
  // absent in the completed baseline, then observed again now.
  if (comparison.newIssues.length) {
    for await (const candidate of listPriorComparisonScans(workspaceId, before.baseUrl, before.createdAt)) {
      const earlier = await loadScanForComparison(candidate.id, workspaceId);
      if (!earlier || earlier.id === before.id || earlier.createdAt >= before.createdAt || earlier.status !== "completed" || profileMismatchReasons(earlier.profile, before.profile).length) continue;
      for (const issue of comparison.newIssues) {
        const current = after.groups.find((group) => group.rootCauseKey === issue.rootCauseKey)!;
        if (earlier.groups.some((group) => group.rootCauseKey === current.rootCauseKey || (group.ruleId === current.ruleId && group.elementKeys?.some((key) => current.elementKeys?.includes(key))))) {
          issue.verificationStatus = "reopened";
        }
      }
      break;
    }
  }
  return { comparable: true, before, after, comparison };
}
