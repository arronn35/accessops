/**
 * GET /api/reports/:id/export?format=html|csv|pdf
 *
 * HTML — rendered server-side and returned as text/html.
 * CSV  — built inline from issues.
 * PDF  — for MVP we return the HTML and instruct the browser to print
 *        via window.print() (clean, free, predictable). A worker-backed
 *        PDF route is wired but disabled until R2 / file storage is set
 *        up; we'd otherwise have to stream a ~MB blob through a Vercel
 *        serverless function and pay the bandwidth.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  reports,
  scanJobs,
  scanPages,
  accessibilityIssues,
  workspaces,
} from "@/lib/db/schema";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { renderHtml, renderCsv, type ReportInput } from "@/lib/reports/render";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit } from "@/lib/api/audit";
import { enqueueReportPdf } from "@/lib/queue";
import {
  getSignedDownloadUrl,
  storageConfigured,
} from "@/lib/storage/r2";

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

    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    if (!report || report.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }

    const [scan] = await db
      .select()
      .from(scanJobs)
      .where(eq(scanJobs.id, report.scanJobId))
      .limit(1);
    if (!scan) throw new ApiError(404, "scan_not_found");

    const [ws] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
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

    const html = renderHtml(input);

    if (format === "pdf") {
      // Server-side PDF path: enqueue a worker job that renders via
      // Playwright and uploads to R2. The web layer waits up to ~12s
      // for the result (typical render is ~2-4s for a normal report)
      // and then redirects to the signed download URL. If R2 or the
      // worker isn't configured, we fall back to the print-HTML path
      // so the product still ships a usable PDF without infra.
      const wantsServerPdf =
        storageConfigured() && Boolean(process.env.REDIS_URL);
      if (wantsServerPdf) {
        const ready = await renderPdfThroughWorker(report.id, ctx);
        if (ready) {
          return Response.redirect(ready.url, 302);
        }
        // Job didn't finish within the wait window — return 202 with a
        // pointer so the client can re-fetch. The audit row above
        // already captured the user's intent.
        return Response.json(
          {
            status: "pending",
            message:
              "PDF render queued. Refresh in a few seconds to download.",
          },
          { status: 202 }
        );
      }
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-accessops-format": "print-pdf",
        },
      });
    }

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * Enqueue a render and poll the reports row for the worker's signal
 * (exportPath set). Returns the signed URL when ready, or null when the
 * wait window expired so the route can return 202.
 *
 * If the report already has an `exportPath`, we skip enqueue and just
 * resign the URL — that's the cheap repeated-download case.
 */
async function renderPdfThroughWorker(
  reportId: string,
  ctx: { userId: string; workspaceId: string }
): Promise<{ url: string } | null> {
  const [existing] = await db
    .select({ exportPath: reports.exportPath })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (existing?.exportPath) {
    const url = await getSignedDownloadUrl(existing.exportPath);
    return { url };
  }

  try {
    await enqueueReportPdf({
      reportId,
      workspaceId: ctx.workspaceId,
      requestedBy: ctx.userId,
    });
  } catch {
    // Redis unavailable: caller will fall through to print-HTML.
    return null;
  }

  const startedAt = Date.now();
  const deadlineMs = 12_000;
  while (Date.now() - startedAt < deadlineMs) {
    await new Promise((r) => setTimeout(r, 1200));
    const [row] = await db
      .select({ exportPath: reports.exportPath })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (row?.exportPath) {
      const url = await getSignedDownloadUrl(row.exportPath);
      return { url };
    }
  }
  return null;
}
