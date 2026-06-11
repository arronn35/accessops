import "server-only";
import {
  getScanJob,
  listIssueGroups,
  listIssues,
  listScanPages,
} from "@/lib/data/firestore";
import { loadReportEvidence } from "@/lib/reports/evidence";
import type { ReportInput } from "@/lib/reports/render";

export interface BuildReportInputParams {
  scanJobId: string;
  workspaceId: string;
  title: string;
  workspaceName: string;
  agencyBranding: boolean;
  /** Builder-selected sections; null/undefined renders everything. */
  sections?: string[] | null;
  reportType?: "full" | "executive" | "csv";
  /**
   * Embed captured screenshots. Kept off for the public share route so
   * share links never carry page imagery.
   */
  includeEvidence?: boolean;
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  moderate: 1,
  minor: 2,
  review: 3,
  passed: 4,
};

export async function buildReportInput(
  params: BuildReportInputParams
): Promise<ReportInput | null> {
  const scan = await getScanJob(params.workspaceId, params.scanJobId);
  if (!scan) return null;
  const [issues, pages, groups] = await Promise.all([
    listIssues(params.workspaceId, scan.id),
    listScanPages(params.workspaceId, scan.id),
    listIssueGroups(params.workspaceId, scan.id),
  ]);
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const counts = { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 };
  for (const issue of issues) counts[issue.severity]++;

  let evidenceByIssue = new Map<string, NonNullable<ReportInput["issues"][number]["evidence"]>>();
  if (params.includeEvidence && scan.storeScreenshots) {
    const candidates = [...issues]
      .sort(
        (a, b) =>
          (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
      )
      .slice(0, 40)
      .map((issue) => issue.id);
    evidenceByIssue = await loadReportEvidence(params.workspaceId, candidates);
  }

  return {
    title: params.title,
    workspaceName: params.workspaceName,
    scanId: scan.id,
    baseUrl: scan.baseUrl,
    pagesScanned: scan.pagesScanned,
    scanDate: scan.completedAt ?? scan.createdAt,
    agencyBranding: params.agencyBranding,
    sections: params.sections ?? null,
    reportType: params.reportType,
    issues: issues.map((issue) => {
      const page = issue.scanPageId ? pageById.get(issue.scanPageId) : null;
      return {
        id: issue.id,
        groupId: issue.groupId,
        ruleId: issue.ruleId,
        severity: issue.severity,
        impact: issue.impact,
        description: issue.description,
        help: issue.help,
        helpUrl: issue.helpUrl,
        wcagTags: issue.wcagTagsJson ?? [],
        pageUrl: page?.url ?? null,
        pageTitle: page?.title ?? null,
        htmlSnippet: issue.htmlSnippet ?? null,
        evidence: evidenceByIssue.get(issue.id) ?? null,
      };
    }),
    counts,
    groups: groups.map((group) => ({
      id: group.id,
      ruleId: group.ruleId,
      title: group.title,
      severity: group.severity,
      affectedCount: group.affectedCount,
      primaryWcagTag: group.primaryWcagTag,
      recommendedFix: group.recommendedFix,
      priority: group.priority,
    })),
  };
}
