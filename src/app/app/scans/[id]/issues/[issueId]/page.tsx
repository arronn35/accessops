import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Camera, ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { WcagBadge } from "@/components/scan/WcagBadge";
import { HumanReviewBanner } from "@/components/compliance/HumanReviewBanner";
import { db } from "@/lib/db";
import {
  accessibilityIssues,
  scanJobs,
  scanPages,
  aiExplanations,
  visualEvidence,
} from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { AiExplanationPanel } from "./ai-panel";
import { IssueActions } from "./issue-actions";
import { DeleteVisualEvidenceButton } from "./visual-evidence-actions";

export const metadata = { title: "Issue — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const ctx = await getCurrentWorkspaceOrRedirect();

  const [row] = await db
    .select({
      issue: accessibilityIssues,
      page: scanPages,
      scan: scanJobs,
    })
    .from(accessibilityIssues)
    .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
    .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
    .where(eq(accessibilityIssues.id, issueId))
    .limit(1);

  if (!row || row.scan?.workspaceId !== ctx.workspace.id) {
    notFound();
  }

  const [latestAi] = await db
    .select()
    .from(aiExplanations)
    .where(eq(aiExplanations.issueId, issueId))
    .orderBy(desc(aiExplanations.createdAt))
    .limit(1);

  const [evidence] = await db
    .select()
    .from(visualEvidence)
    .where(eq(visualEvidence.issueId, issueId))
    .orderBy(desc(visualEvidence.createdAt))
    .limit(1);

  const { issue, page } = row;
  const level = (issue.wcagTagsJson ?? []).includes("wcag2aaa")
    ? "AAA"
    : (issue.wcagTagsJson ?? []).includes("wcag2aa")
    ? "AA"
    : "A";
  const criterion = (issue.wcagTagsJson ?? []).find((t: string) => /^wcag\d/.test(t)) ?? "—";

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1400px]">
      <Link
        href={`/app/scans/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900 mb-4"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to scan results
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SeverityBadge severity={issue.severity as "critical" | "moderate" | "minor" | "review" | "passed"} />
            <Badge tone="neutral" size="sm" className="font-mono">{issue.ruleId}</Badge>
            {issue.humanReviewRequired && (
              <Badge tone="warning" size="sm">Needs human review</Badge>
            )}
          </div>
          <h1 className="text-xl lg:text-2xl font-semibold text-ink-900 tracking-tight leading-snug">
            {issue.help}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <WcagBadge criterion={criterion} level={level} version="2.2" />
            <span className="text-xs text-ink-500 font-mono truncate max-w-[400px]">
              {page?.url ?? "—"}
            </span>
          </div>
        </div>

        <IssueActions issueId={issueId} initialStatus={issue.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-700 leading-relaxed">{issue.description}</p>
              {issue.helpUrl && (
                <a
                  href={issue.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-3"
                >
                  axe-core help <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-4 text-blue-600" aria-hidden /> Visual evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VisualEvidencePanel
                evidence={evidence ?? null}
                pageUrl={page?.url ?? row.scan?.baseUrl ?? "—"}
                canDelete={ctx.member.role === "owner" || ctx.member.role === "admin"}
              />
            </CardContent>
          </Card>

          {issue.htmlSnippet && (
            <Card>
              <CardHeader>
                <CardTitle>Failing element</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs leading-relaxed font-mono text-ink-900 bg-canvas-2 p-3 rounded-md overflow-x-auto">
                  <code>{issue.htmlSnippet}</code>
                </pre>
                {issue.targetJson && (issue.targetJson as string[]).length > 0 && (
                  <p className="text-[11px] text-ink-500 mt-2 font-mono">
                    Selector: {(issue.targetJson as string[]).join(" >> ")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <AiExplanationPanel
            issueId={issueId}
            initial={
              latestAi
                ? {
                    explanationPlain: latestAi.explanationPlain,
                    framework: latestAi.framework,
                    modelProvider: latestAi.modelProvider,
                    createdAt: latestAi.createdAt.toISOString(),
                  }
                : null
            }
            aiEnabled={!!ctx.privacy?.aiProcessingEnabled}
          />

          {issue.humanReviewRequired && <HumanReviewBanner />}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-ink-900 capitalize">
                {issue.status.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-ink-500 mt-1">
                Update from the actions above.
              </p>
              <div className="mt-4 pt-4 border-t border-line space-y-3 text-xs">
                <KeyVal label="Rule"><span className="font-mono">{issue.ruleId}</span></KeyVal>
                <KeyVal label="Impact">{issue.impact}</KeyVal>
                <KeyVal label="Severity">{issue.severity}</KeyVal>
                <KeyVal label="WCAG level">{level}</KeyVal>
                <KeyVal label="Tags">
                  <span className="font-mono">{(issue.wcagTagsJson ?? []).join(", ") || "—"}</span>
                </KeyVal>
              </div>
            </CardContent>
          </Card>

          {row.scan && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-600" aria-hidden /> Scan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-ink-700 font-mono break-all">{row.scan.baseUrl}</p>
                <Link
                  href={`/app/scans/${id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-3"
                >
                  Back to scan results →
                </Link>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function KeyVal({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-500 font-medium">{label}</span>
      <span className="text-ink-900 text-right truncate max-w-[200px]">{children}</span>
    </div>
  );
}

function VisualEvidencePanel({
  evidence,
  pageUrl,
  canDelete,
}: {
  evidence: typeof visualEvidence.$inferSelect | null;
  pageUrl: string;
  canDelete: boolean;
}) {
  if (!evidence) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink-700">No visual evidence was captured for this issue.</p>
        <p className="text-xs text-ink-500">{COMPLIANCE_COPY.SCREENSHOT_NOTICE}</p>
      </div>
    );
  }
  const unavailable = !!evidence.deletedAt || evidence.expiresAt <= new Date();
  const canShow = Boolean(
    !unavailable &&
    evidence.screenshotKey &&
    (evidence.screenshotStatus === "captured" || evidence.screenshotStatus === "redacted")
  );
  const status = unavailable ? "skipped" : evidence.screenshotStatus;
  const reason = unavailable ? "expired_or_deleted" : evidence.failureReason;

  return (
    <div className="space-y-3">
      {canShow ? (
        <a
          href={`/api/visual-evidence/${evidence.id}/image`}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-md ring-1 ring-line bg-canvas-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/visual-evidence/${evidence.id}/image`}
            alt="Diagnostic visual evidence for this accessibility issue"
            className="max-h-[520px] w-full object-contain"
          />
        </a>
      ) : (
        <div className="rounded-md bg-canvas-2 ring-1 ring-line p-4">
          <p className="text-sm font-medium text-ink-900">Screenshot {status}</p>
          <p className="text-xs text-ink-600 mt-1">{reason ? evidenceReason(reason) : "Image not available."}</p>
        </div>
      )}
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <KeyVal label="Selector">
          <span className="font-mono">{evidence.selector ?? "—"}</span>
        </KeyVal>
        <KeyVal label="Page">
          <span className="font-mono">{pageUrl}</span>
        </KeyVal>
        <KeyVal label="Status">{status}</KeyVal>
        <KeyVal label="Redaction">{evidence.redactionApplied ? "Applied" : "Not applied"}</KeyVal>
      </dl>
      <p className="text-xs text-ink-500 leading-relaxed">
        This screenshot is captured for diagnostic accessibility evidence only. {COMPLIANCE_COPY.VISUAL_EVIDENCE_WARNING}
      </p>
      {canDelete && canShow && <DeleteVisualEvidenceButton evidenceId={evidence.id} />}
    </div>
  );
}

function evidenceReason(reason: string): string {
  const labels: Record<string, string> = {
    element_not_visible: "The affected element was not visible at capture time.",
    selector_not_found: "The target selector could not be resolved safely.",
    screenshot_disabled: "Screenshot capture was disabled for this scan.",
    privacy_settings_disabled: "Workspace privacy settings disabled screenshot capture.",
    sensitive_page_skipped: "The page appeared to contain sensitive or private content.",
    capture_failed: "The screenshot capture failed.",
    storage_disabled: "Private screenshot storage is not enabled.",
    screenshot_storage_disabled: "Screenshot storage was disabled for this scan.",
    expired_or_deleted: "This evidence was deleted or passed its retention window.",
    screenshot_limit_reached: "The scan reached its visual evidence limit.",
    duplicate_issue_skipped: "A duplicate issue already had visual evidence captured.",
  };
  return labels[reason] ?? reason.replace(/_/g, " ");
}
