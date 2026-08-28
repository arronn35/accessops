/**
 * GET /api/reports/:id/export?format=html|csv|pdf
 *
 * All three formats are produced synchronously from the same
 * `ReportInput` (see src/lib/reports/load.ts):
 *
 *   HTML — rendered server-side and returned as text/html.
 *   CSV  — flat issues table, returned as a download.
 *   PDF  — rendered with pdf-lib (pure JS, no Chromium, no object
 *          storage) and returned as a download. The worker-backed
 *          render in worker/report-pdf.ts still exists to pre-bake a
 *          copy into R2 when that infrastructure is configured, but the
 *          export no longer depends on it — a deployment with neither
 *          Redis nor S3 still downloads a real PDF.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { renderHtml, renderCsv } from "@/lib/reports/render";
import { renderPdf, pdfFilename } from "@/lib/reports/pdf";
import { loadReportInput } from "@/lib/reports/load";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit } from "@/lib/api/audit";

const FormatSchema = z.enum(["html", "csv", "pdf"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const parsedFormat = FormatSchema.safeParse(
      req.nextUrl.searchParams.get("format") ?? "html"
    );
    if (!parsedFormat.success) throw new ApiError(400, "invalid_format");
    const format = parsedFormat.data;

    const rl = await checkRateLimit("reportExport", ctx.workspaceId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining);

    const loaded = await loadReportInput(id);
    if (!loaded || loaded.report.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }
    const { input } = loaded;

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "report.exported",
      resourceType: "report",
      resourceId: id,
      metadata: { format },
    });

    if (format === "csv") {
      return new Response(renderCsv(input), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="accessops-report-${id}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await renderPdf(input);
      // Copy into a fresh ArrayBuffer so the Response body is a plain
      // BodyInit regardless of how the Uint8Array is backed.
      return new Response(pdf.slice().buffer as ArrayBuffer, {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${pdfFilename(id)}"`,
          "content-length": String(pdf.byteLength),
        },
      });
    }

    return new Response(renderHtml(input), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return apiError(err);
  }
}
