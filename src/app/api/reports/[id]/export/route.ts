import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit, getReport, getWorkspace } from "@/lib/data/firestore";
import { renderCsv, renderHtml, renderJson } from "@/lib/reports/render";
import { renderPdfFromHtml } from "@/lib/reports/pdf";
import { buildReportInput } from "@/lib/reports/build-input";
import { agencyBrandingEnabled, roleHasPermission } from "@/lib/entitlements";

const FormatSchema = z.enum(["html", "csv", "json", "pdf"]);

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "export_reports")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const parsedFormat = FormatSchema.safeParse(req.nextUrl.searchParams.get("format") ?? "html");
    if (!parsedFormat.success) throw new ApiError(400, "invalid_format");
    const format = parsedFormat.data;
    const rl = await checkRateLimit("reportExport", ctx.workspaceId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining);

    const report = await getReport(ctx.workspaceId, id);
    if (!report) throw new ApiError(404, "not_found");
    const workspace = await getWorkspace(ctx.workspaceId);
    const input = await buildReportInput({
      scanJobId: report.scanJobId,
      workspaceId: ctx.workspaceId,
      title: report.title,
      workspaceName: workspace?.name ?? "Workspace",
      agencyBranding: agencyBrandingEnabled(workspace?.plan ?? "free"),
    });
    if (!input) throw new ApiError(404, "scan_not_found");
    await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "report.exported", resourceType: "report", resourceId: id, metadata: { format } });
    const filenameBase = `accessops-report-${safeFilename(id)}`;

    if (format === "html") {
      return new Response(renderHtml(input), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-disposition": `attachment; filename="${filenameBase}.html"`,
        },
      });
    }

    if (format === "csv") {
      return new Response(renderCsv(input), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${filenameBase}.csv"`,
        },
      });
    }
    if (format === "json") {
      return new Response(renderJson(input), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${filenameBase}.json"`,
        },
      });
    }

    let pdf: Buffer;
    try {
      pdf = await renderPdfFromHtml(renderHtml(input));
    } catch (err) {
      console.error("[reports] pdf generation failed", err);
      throw new ApiError(
        503,
        "pdf_unavailable",
        "PDF generation failed. Server-side Chromium is unavailable or could not render the report."
      );
    }
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filenameBase}.pdf"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "report";
}
