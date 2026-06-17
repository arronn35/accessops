import type { AccessibilityIssue, IssueGroup, ScanJob, ScanPage } from "@/lib/data/types";
import { projectFolderForScan } from "@/lib/remediation/project-folder";

export interface AiScanContextInput {
  scan: ScanJob;
  issues: AccessibilityIssue[];
  pages: ScanPage[];
  groups: IssueGroup[];
}

export function buildAiScanContext({ scan, issues, pages, groups }: AiScanContextInput): string {
  const project = projectFolderForScan(scan);
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const counts = countSeverities(issues);
  const topGroups = groups
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8)
    .map(
      (group) =>
        `- ${group.title} (${group.severity}, ${group.affectedCount} instance(s), rule ${group.ruleId})${group.recommendedFix ? `: ${group.recommendedFix}` : ""}`
    );
  const topIssues = issues
    .slice(0, 12)
    .map((issue) => {
      const page = issue.scanPageId ? pageById.get(issue.scanPageId) : null;
      return `- ${issue.help} (${issue.severity}, rule ${issue.ruleId}) on ${page?.url ?? scan.baseUrl}`;
    });

  return [
    "Selected project context:",
    "Scope rule: Base the answer on this selected past scan and its project. Do not answer from another project unless the user explicitly asks to compare or generalize.",
    `Project folder: ${project.projectLabel} (${project.projectKey})`,
    `Scan ID: ${scan.id}`,
    `Scan status: ${scan.status}`,
    `Scan completed: ${(scan.completedAt ?? scan.updatedAt).toISOString()}`,
    `Base URL: ${scan.baseUrl}`,
    `Pages scanned: ${scan.pagesScanned}`,
    scan.sourceUrlsJson?.urls?.length
      ? `Manual source URLs: ${scan.sourceUrlsJson.urls.slice(0, 8).join(", ")}`
      : null,
    scan.sourceUrlsJson?.sitemapUrl ? `Sitemap URL: ${scan.sourceUrlsJson.sitemapUrl}` : null,
    `Issue counts: critical ${counts.critical}, moderate ${counts.moderate}, minor ${counts.minor}, review ${counts.review}`,
    topGroups.length ? `Root-cause groups:\n${topGroups.join("\n")}` : null,
    topIssues.length ? `Representative issues:\n${topIssues.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function countSeverities(issues: AccessibilityIssue[]) {
  const counts = { critical: 0, moderate: 0, minor: 0, review: 0 };
  for (const issue of issues) {
    if (issue.severity === "critical") counts.critical++;
    else if (issue.severity === "moderate") counts.moderate++;
    else if (issue.severity === "minor") counts.minor++;
    else if (issue.severity === "review") counts.review++;
  }
  return counts;
}
