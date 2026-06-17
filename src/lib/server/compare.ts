import "server-only";
import {
  getScanJob,
  getScanSummary,
  listIssueGroups,
  listScans,
} from "@/lib/data/firestore";
import {
  compareScans,
  type CompareGroupInput,
  type CompareScoreInput,
  type ScanComparison,
} from "@/lib/scanner/compare";

export interface LoadedScan {
  id: string;
  baseUrl: string;
  createdAt: Date;
  completedAt: Date | null;
  status: string;
  groups: CompareGroupInput[];
  score: CompareScoreInput | null;
}

export type ComparisonResult =
  | { comparable: false; reason: "no_prior_scan"; after: LoadedScan }
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
  const [groups, summary] = await Promise.all([
    listIssueGroups(workspaceId, scanId),
    getScanSummary(workspaceId, scanId),
  ]);
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
    })),
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
  let before: LoadedScan | null = null;
  if (againstId) {
    before = await loadScanForComparison(againstId, workspaceId);
    if (!before) throw new ComparisonError("comparison_scan_not_found");
    if (before.baseUrl !== after.baseUrl) throw new ComparisonError("base_url_mismatch");
  } else {
    const prior = (await listScans(workspaceId, 50))
      .filter((s) => s.status === "completed" && s.baseUrl === after.baseUrl && s.id !== after.id && s.createdAt < after.createdAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!prior) return { comparable: false, reason: "no_prior_scan", after };
    before = await loadScanForComparison(prior.id, workspaceId);
  }
  if (!before) return { comparable: false, reason: "no_prior_scan", after };
  return {
    comparable: true,
    before,
    after,
    comparison: compareScans(
      { groups: before.groups, score: before.score },
      { groups: after.groups, score: after.score }
    ),
  };
}
