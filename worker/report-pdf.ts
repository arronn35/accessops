/**
 * Worker-side report PDF rendering.
 *
 * Triggered by BullMQ via the `accessops-reports-pdf` queue (see
 * src/lib/queue.ts). For each job we:
 *
 *   1. Load the report + scan + issues from Postgres.
 *   2. Reuse the existing `renderHtml()` helper so HTML and PDF stay
 *      structurally identical (no second template to drift).
 *   3. Launch Chromium via Playwright (already shipped in the worker
 *      image), set the HTML as content, and print to a Buffer.
 *   4. Upload to the configured S3-compatible bucket under a per-
 *      workspace key.
 *   5. Persist the object key on `reports.exportPath` so the web export
 *      route can resolve it to a signed URL.
 *
 * The worker already opens browsers for scans — we deliberately don't
 * try to share a single browser across both consumers; the lifecycles
 * are different and PDF runs are short-lived. Each job opens and
 * closes its own browser to keep memory bounded.
 */
import { chromium } from "playwright";
import { eq } from "drizzle-orm";
import {
  db,
  reports,
  scanJobs,
  scanPages,
  accessibilityIssues,
  workspaces,
} from "../src/lib/db";
import { renderHtml, type ReportInput } from "../src/lib/reports/render";
import { putBuffer, storageConfigured } from "../src/lib/storage/r2";
import { captureException } from "../src/lib/observability";

export async function renderReportPdf(reportId: string): Promise<{ key: string }> {
  if (!storageConfigured()) {
    throw new Error("storage_not_configured");
  }

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!report) throw new Error(`report ${reportId} not found`);

  const [scan] = await db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.id, report.scanJobId))
    .limit(1);
  if (!scan) throw new Error(`scan ${report.scanJobId} not found`);

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
  for (const i of issueRows) counts[i.severity as keyof typeof counts]++;

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

  const html = renderHtml(input);

  // ----- Chromium → PDF -----
  // Use the same launch flags as the scan path (no sandbox in container).
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  let pdf: Buffer;
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
    pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "16mm", bottom: "20mm", left: "16mm" },
    });
    await context.close();
  } finally {
    await browser.close();
  }

  // ----- Upload -----
  const key = `reports/${report.workspaceId}/${report.id}.pdf`;
  await putBuffer({
    key,
    body: pdf,
    contentType: "application/pdf",
    contentDisposition: `attachment; filename="accessops-report-${report.id}.pdf"`,
  });

  await db
    .update(reports)
    .set({ exportPath: key, updatedAt: new Date() })
    .where(eq(reports.id, reportId));

  return { key };
}

export function reportPdfHandler(jobData: { reportId: string }) {
  return renderReportPdf(jobData.reportId).catch((err) => {
    void captureException(err, {
      scope: "worker.report-pdf",
      reportId: jobData.reportId,
    });
    throw err;
  });
}
