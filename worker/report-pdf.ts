/**
 * Worker-side report PDF rendering.
 *
 * Triggered by BullMQ via the `accessops-reports-pdf` queue (see
 * src/lib/queue.ts). For each job we:
 *
 *   1. Load the report + scan + issues via the shared `loadReportInput`
 *      helper — the same one the web export route uses.
 *   2. Render with `renderPdf()`, so a worker-baked PDF is byte-for-byte
 *      the same document a direct download produces.
 *   3. Upload to the configured S3-compatible bucket under a per-
 *      workspace key.
 *   4. Persist the object key on `reports.exportPath`.
 *
 * This path is an optimisation, not a dependency: the web export route
 * renders its own PDF on demand, so a deployment without R2 or Redis
 * still exports PDFs. Pre-baking to storage is useful when the same
 * report is downloaded repeatedly, or shared by signed URL.
 *
 * Rendering is pure JS (pdf-lib) — no browser is launched here, unlike
 * the scan path.
 */
import { eq } from "drizzle-orm";
import { db, reports } from "../src/lib/db";
import { loadReportInput } from "../src/lib/reports/load";
import { renderPdf } from "../src/lib/reports/pdf";
import { putBuffer, storageConfigured } from "../src/lib/storage/r2";
import { captureException } from "../src/lib/observability";

export async function renderReportPdf(reportId: string): Promise<{ key: string }> {
  if (!storageConfigured()) {
    throw new Error("storage_not_configured");
  }

  const loaded = await loadReportInput(reportId);
  if (!loaded) throw new Error(`report ${reportId} not found`);
  const { report, input } = loaded;

  const pdf = await renderPdf(input);

  const key = `reports/${report.workspaceId}/${report.id}.pdf`;
  await putBuffer({
    key,
    body: Buffer.from(pdf),
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
