import { NextRequest } from "next/server";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { getScanJob, listIssues, listScanPages } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  moderate: 1,
  review: 2,
  minor: 3,
  passed: 4,
};
const SEVERITIES = new Set(Object.keys(SEVERITY_RANK));

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("view_scans");
    const { id } = await params;
    const job = await getScanJob(ctx.workspaceId, id);
    if (!job) throw new ApiError(404, "not_found");
    const [issues, pages] = await Promise.all([
      listIssues(ctx.workspaceId, id),
      listScanPages(ctx.workspaceId, id),
    ]);
    const pageById = new Map(pages.map((p) => [p.id, p]));
    const rows = issues
      .map((issue) => {
        const page = issue.scanPageId ? pageById.get(issue.scanPageId) : null;
        return {
          ...issue,
          pageUrl: page?.url ?? null,
          pageTitle: page?.title ?? null,
        };
      })
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

    const severityFilter = req.nextUrl.searchParams.get("severity");
    if (severityFilter && !SEVERITIES.has(severityFilter)) {
      throw new ApiError(400, "invalid_severity");
    }
    const filtered = severityFilter ? rows.filter((r) => r.severity === severityFilter) : rows;

    if (req.nextUrl.searchParams.get("format") === "csv") {
      // CSV is a data export, not a read: it needs export_reports on top of view_scans.
      if (!roleHasPermission(ctx.role, "export_reports")) throw new ApiError(403, "forbidden");
      const csv = [
        ["id", "ruleId", "severity", "impact", "pageUrl", "help"].join(","),
        ...filtered.map((r) =>
          [r.id, r.ruleId, r.severity, r.impact, r.pageUrl ?? "", r.help]
            .map((v) => `"${String(v).replaceAll("\"", "\"\"")}"`)
            .join(",")
        ),
      ].join("\n");
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="scan-${id}-issues.csv"`,
        },
      });
    }

    return Response.json({ issues: filtered, total: rows.length });
  } catch (err) {
    return apiError(err);
  }
}
