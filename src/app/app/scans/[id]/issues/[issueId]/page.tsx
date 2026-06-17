import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { WcagBadge } from "@/components/scan/WcagBadge";
import { HumanReviewBanner } from "@/components/compliance/HumanReviewBanner";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { getIssue, getScanJob, getVisualEvidenceForIssue, listScanPages } from "@/lib/data/firestore";
import { AiExplanationPanel } from "./ai-panel";
import { IssueActions } from "./issue-actions";
import { IssueEvidenceImage } from "./issue-evidence-image";

export const metadata = { title: "Issue — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const ctx = await getCurrentWorkspaceOrRedirect();
  const [scan, issue, pages, evidence] = await Promise.all([
    getScanJob(ctx.workspace.id, id),
    getIssue(ctx.workspace.id, id, issueId),
    listScanPages(ctx.workspace.id, id),
    getVisualEvidenceForIssue(ctx.workspace.id, issueId),
  ]);
  if (!scan || !issue) notFound();
  const page = issue.scanPageId ? pages.find((item) => item.id === issue.scanPageId) : null;
  const level = issue.wcagTagsJson.includes("wcag2aaa")
    ? "AAA"
    : issue.wcagTagsJson.includes("wcag2aa")
    ? "AA"
    : "A";
  const criterion = issue.wcagTagsJson.find((t) => /^wcag\d/.test(t)) ?? "-";

  return (
    <div className="box-border w-full min-w-0 max-w-[1200px] overflow-x-hidden px-4 py-8 lg:px-8">
      <Link href={`/app/scans/${id}`} className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900 mb-4">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to scan results
      </Link>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SeverityBadge severity={issue.severity} />
            <Badge tone="neutral" size="sm" className="font-mono">{issue.ruleId}</Badge>
            {issue.humanReviewRequired && <Badge tone="warning" size="sm">Needs human review</Badge>}
          </div>
          <h1 className="text-xl lg:text-2xl font-semibold text-ink-900 tracking-tight leading-snug break-words">{issue.help}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <WcagBadge criterion={criterion} level={level} version="2.2" />
            <span className="max-w-full truncate font-mono text-xs text-ink-500 lg:max-w-[400px]">{page?.url ?? scan.baseUrl}</span>
          </div>
        </div>
        <div className="min-w-0 shrink-0 lg:max-w-[420px]">
          <IssueActions issueId={issueId} initialStatus={issue.status} />
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-ink-700 leading-relaxed break-words">{issue.description}</p>
              {issue.helpUrl && (
                <a href={issue.helpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-3">
                  rule help <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </CardContent>
          </Card>
          {issue.htmlSnippet && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader><CardTitle>Failing element</CardTitle></CardHeader>
              <CardContent>
                <pre className="max-w-full whitespace-pre-wrap break-words rounded-md bg-canvas-2 p-3 font-mono text-xs leading-relaxed text-ink-900 [overflow-wrap:anywhere]"><code>{issue.htmlSnippet}</code></pre>
              </CardContent>
            </Card>
          )}
          {evidence && (
            <section aria-labelledby="visual-evidence-title" className="min-w-0">
              <h2 id="visual-evidence-title" className="mb-3 text-sm font-semibold text-ink-900">
                Visual evidence
              </h2>
                {evidence.imageDataBase64 ? (
                  <IssueEvidenceImage
                    src={`/api/visual-evidence/${evidence.id}/image`}
                    alt="Screenshot showing the affected page area"
                    boundingBox={evidence.boundingBoxJson}
                    viewport={evidence.viewportJson}
                  />
                ) : (
                  <p className="text-sm text-ink-700">
                    Screenshot status: {evidence.screenshotStatus}
                    {evidence.failureReason ? ` (${evidence.failureReason})` : ""}
                  </p>
                )}
                <p className="mt-3 max-w-full break-all font-mono text-xs text-ink-500">
                  Selector: {evidence.selector ?? "not available"}
                </p>
            </section>
          )}
          <AiExplanationPanel issueId={issueId} initial={null} aiEnabled={!!ctx.privacy.aiProcessingEnabled} />
          {issue.humanReviewRequired && <HumanReviewBanner />}
        </div>
        <aside className="min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-ink-700">
              <p className="text-sm font-medium text-ink-900 capitalize">{issue.status.replace(/_/g, " ")}</p>
              <p>Impact: {issue.impact}</p>
              <p>Severity: {issue.severity}</p>
              <p className="break-words font-mono">Tags: {issue.wcagTagsJson.join(", ") || "-"}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
