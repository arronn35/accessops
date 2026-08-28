/**
 * Load everything a report export needs from the database and shape it
 * into the `ReportInput` all three renderers (HTML, CSV, PDF) consume.
 *
 * Both the web export route and the worker's PDF job used to carry
 * their own copy of this query; keeping one loader means an added
 * column or a changed join can't make the two exports disagree.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  reports,
  scanJobs,
  scanPages,
  accessibilityIssues,
  workspaces,
  type Report,
} from "@/lib/db/schema";
import type { ReportInput } from "@/lib/reports/render";

export interface LoadedReport {
  report: Report;
  input: ReportInput;
}

/**
 * Returns null when the report or its scan no longer exists. Callers are
 * responsible for authorizing `report.workspaceId` against the session —
 * this loader deliberately does not assume a request context so the
 * worker can use it too.
 */
export async function loadReportInput(
  reportId: string
): Promise<LoadedReport | null> {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!report) return null;

  const [scan] = await db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.id, report.scanJobId))
    .limit(1);
  if (!scan) return null;

  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, report.workspaceId))
    .limit(1);

  const issueRows = await db
    .select({
      id: accessibilityIssues.id,
      ruleId: accessibilityIssues.ruleId,
      severity: accessibilityIssues.severity,
      impact: accessibilityIssues.impact,
      description: accessibilityIssues.description,
      help: accessibilityIssues.help,
      helpUrl: accessibilityIssues.helpUrl,
      wcagTagsJson: accessibilityIssues.wcagTagsJson,
      htmlSnippet: accessibilityIssues.htmlSnippet,
      pageUrl: scanPages.url,
      pageTitle: scanPages.title,
    })
    .from(accessibilityIssues)
    .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
    .where(eq(accessibilityIssues.scanJobId, scan.id));

  const counts = { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 };
  for (const i of issueRows) {
    if (i.severity in counts) counts[i.severity as keyof typeof counts]++;
  }

  const input: ReportInput = {
    title: report.title,
    workspaceName: ws?.name ?? "Workspace",
    scanId: scan.id,
    baseUrl: scan.baseUrl,
    pagesScanned: scan.pagesScanned,
    scanDate: scan.completedAt ?? scan.createdAt,
    issues: issueRows.map((i) => ({
      id: i.id,
      ruleId: i.ruleId,
      severity: i.severity,
      impact: i.impact,
      description: i.description,
      help: i.help,
      helpUrl: i.helpUrl ?? null,
      wcagTags: i.wcagTagsJson ?? [],
      pageUrl: i.pageUrl,
      pageTitle: i.pageTitle,
      htmlSnippet: i.htmlSnippet ?? null,
    })),
    counts,
  };

  return { report, input };
}
