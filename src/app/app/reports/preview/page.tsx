import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import {
  getScanJob,
  getScanSummary,
  listIssues,
  listScans,
  listScanPages,
} from "@/lib/data/firestore";
import { renderHtml } from "@/lib/reports/render";

export const metadata = { title: "Report preview — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scanId?: string }>;
}) {
  const { scanId } = await searchParams;
  const ctx = await getCurrentWorkspaceOrRedirect();
  const scan = scanId
    ? await getScanJob(ctx.workspace.id, scanId)
    : (await listScans(ctx.workspace.id, 20)).find((item) => item.status === "completed") ?? null;
  if (!scan) return <EmptyState />;
  const [issues, pages, summary] = await Promise.all([
    listIssues(ctx.workspace.id, scan.id),
    listScanPages(ctx.workspace.id, scan.id),
    getScanSummary(ctx.workspace.id, scan.id),
  ]);
  const failedStoredPages = pages.filter((page) => {
    const metadata = page.rawMetadataJson;
    return (
      metadata !== null &&
      typeof metadata === "object" &&
      (metadata as Record<string, unknown>).scanFailed === true
    );
  });
  const failedPageUrls =
    summary?.failedPageUrls ??
    Array.from(new Set(failedStoredPages.map((page) => page.url)));
  const pagesFailedToScan =
    summary?.pagesFailedToScan ?? failedStoredPages.length;
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const counts = { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 };
  for (const issue of issues) counts[issue.severity]++;
  const html = renderHtml({
    title: `${hostFromUrl(scan.baseUrl)} accessibility report`,
    workspaceName: ctx.workspace.name,
    scanId: scan.id,
    baseUrl: scan.baseUrl,
    pagesScanned:
      summary?.pageScoresJson.length ??
      Math.max(0, pages.length - failedStoredPages.length),
    pagesFailedToScan,
    failedPageUrls,
    scanDate: scan.completedAt ?? scan.createdAt,
    counts,
    agencyBranding: false,
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
        wcagTags: issue.wcagTagsJson,
        pageUrl: page?.url ?? null,
        pageTitle: page?.title ?? null,
        htmlSnippet: issue.htmlSnippet,
      };
    }),
  });
  return (
    <div className="bg-canvas-2 min-h-full pb-20">
      <div className="no-print sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line px-4 lg:px-8 h-14 flex items-center justify-between">
        <Link href={`/app/reports/builder?scanId=${scan.id}`} className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to builder
        </Link>
        <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-navy-900 text-paper text-sm font-medium">
          <Printer className="size-4" aria-hidden /> Use browser print
        </span>
      </div>
      <iframe title="Report preview" srcDoc={html} className="mx-auto my-8 block h-[80vh] w-full max-w-4xl rounded-md bg-paper shadow-[var(--shadow-card)]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-4 lg:px-8 py-12">
      <h1 className="text-xl font-semibold text-ink-900">No completed scan yet</h1>
      <p className="text-sm text-ink-600 mt-2">Run a scan before building a report.</p>
      <Link href="/app/scans/new" className="inline-flex mt-4 h-10 px-3 rounded-md bg-navy-900 text-paper text-sm items-center">
        Start scan
      </Link>
    </div>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
