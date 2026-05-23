import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import {
  AlertTriangle, ArrowLeft, Download, FileBarChart2, Filter, Globe, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScanScoreRing } from "@/components/scan/ScanScoreRing";
import { IssueCard } from "@/components/scan/IssueCard";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { HumanReviewBanner } from "@/components/compliance/HumanReviewBanner";
import { db } from "@/lib/db";
import {
  scanJobs,
  scanPages,
  accessibilityIssues,
  scanSummaries,
} from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { type IssueCategory } from "@/lib/mock/issues";
import { formatDate, formatRelative } from "@/lib/utils";

export const metadata = { title: "Scan results — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function ScanResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentWorkspaceOrRedirect();

  const [scan] = await db
    .select()
    .from(scanJobs)
    .where(and(eq(scanJobs.id, id), eq(scanJobs.workspaceId, ctx.workspace.id)))
    .limit(1);

  if (!scan) notFound();
  if (scan.status !== "completed") {
    redirect(`/app/scans/${id}/progress`);
  }

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
      targetJson: accessibilityIssues.targetJson,
      contextsJson: accessibilityIssues.contextsJson,
      htmlSnippet: accessibilityIssues.htmlSnippet,
      humanReviewRequired: accessibilityIssues.humanReviewRequired,
      status: accessibilityIssues.status,
      pageUrl: scanPages.url,
      pageTitle: scanPages.title,
    })
    .from(accessibilityIssues)
    .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
    .where(eq(accessibilityIssues.scanJobId, scan.id))
    .orderBy(asc(accessibilityIssues.severity));

  const pages = await db
    .select()
    .from(scanPages)
    .where(eq(scanPages.scanJobId, scan.id));

  const [summary] = await db
    .select()
    .from(scanSummaries)
    .where(eq(scanSummaries.scanJobId, scan.id))
    .limit(1);

  const scanProfile = readScanProfile(pages);

  const counts = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    review: 0,
    passed: 0,
  };
  for (const i of issueRows) {
    if (i.severity === "review") counts.review++;
    else if (i.impact === "critical") counts.critical++;
    else if (i.impact === "serious") counts.serious++;
    else if (i.impact === "moderate") counts.moderate++;
    else if (i.impact === "minor") counts.minor++;
    else counts[i.severity as keyof typeof counts]++;
  }

  const score = summary?.overallScore ?? legacyScore(counts);
  const contextSummary = summarizeContexts(issueRows);

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/scans/${scan.id}/issues?format=csv`}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
          >
            <Download className="size-4" aria-hidden /> Export issues
          </Link>
          <Link
            href={`/app/reports/builder?scanId=${scan.id}`}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
          >
            <FileBarChart2 className="size-4" aria-hidden /> Build report
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {scanProfile.fallbackMode && (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
              <p>
                This scan used a degraded static fallback and may miss JavaScript-rendered accessibility issues.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-start">
            <ScanScoreRing score={score} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge tone="success" size="sm">Complete</Badge>
                <Badge tone="neutral" size="sm" className="font-mono">{scan.id}</Badge>
                <span className="text-xs text-ink-500">
                  Scanned {formatRelative(scan.startedAt ?? scan.createdAt)} ·{" "}
                  {formatDate(scan.startedAt ?? scan.createdAt)}
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-semibold text-ink-900 tracking-tight flex items-center gap-2 flex-wrap">
                <Globe className="size-5 text-ink-500" aria-hidden />
                <span className="font-mono text-base lg:text-lg break-all">{hostFromUrl(scan.baseUrl)}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-ink-600">
                <span>
                  <strong className="text-ink-900 font-semibold">{scan.pagesScanned}</strong> pages
                </span>
                <span className="text-ink-300">·</span>
                <span>
                  <strong className="text-ink-900 font-semibold">{issueRows.length}</strong> findings
                </span>
                <span className="text-ink-300">·</span>
                <span>{formatScanEngine(scanProfile)}</span>
                {summary && (
                  <>
                    <span className="text-ink-300">·</span>
                    <span>
                      Grade <strong className="text-ink-900 font-semibold">{summary.grade}</strong>
                    </span>
                    <span className="text-ink-300">·</span>
                    <span>
                      Risk <strong className="text-ink-900 font-semibold">{summary.riskLevel}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 lg:flex-col w-full lg:w-auto">
              <SeverityStat severity="critical" count={counts.critical} />
              <SeverityStat severity="serious" count={counts.serious} />
              <SeverityStat severity="moderate" count={counts.moderate} />
              <SeverityStat severity="minor" count={counts.minor} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          {issueRows.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-sm text-ink-700">
                  Automated checks didn&apos;t surface any findings on this scan. Human review may
                  still uncover issues — see the manual checklist on each page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <AiSuggestionBlock title="What this scan tells you">
              <p>
                The scan surfaced {counts.critical + counts.moderate} blocking and moderate-impact
                issues across {scan.pagesScanned} page(s). Critical findings typically reuse patterns
                across many pages, so fixing the top rules often eliminates multiple findings at once.
                {counts.review > 0 &&
                  ` ${counts.review} item(s) need human review where automated checks could not decide.`}
              </p>
            </AiSuggestionBlock>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
              <Filter className="size-3.5" aria-hidden /> Filter:
            </span>
            <FilterChip label="All" count={issueRows.length} active />
            <FilterChip label="Critical" count={counts.critical} severity="critical" />
            <FilterChip label="Serious" count={counts.serious} severity="serious" />
            <FilterChip label="Moderate" count={counts.moderate} severity="moderate" />
            <FilterChip label="Minor" count={counts.minor} severity="minor" />
            <FilterChip label="Needs review" count={counts.review} severity="review" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
              <Filter className="size-3.5" aria-hidden /> Viewport:
            </span>
            <FilterChip label="Desktop" count={contextSummary.desktop} />
            <FilterChip label="Mobile" count={contextSummary.mobile} />
            <FilterChip label="Both" count={contextSummary.both} />
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700 ml-2">
              State:
            </span>
            {Object.entries(contextSummary.states).map(([state, count]) => (
              <FilterChip key={state} label={state} count={count} />
            ))}
          </div>

          <div className="space-y-2.5">
            {issueRows.map((issue) => (
              <div key={issue.id} className="space-y-1">
                <ContextLine contexts={issue.contextsJson ?? []} />
                <IssueCard
                  scanId={scan.id}
                  issue={{
                    id: issue.id,
                    title: issue.help,
                    severity: issue.severity as "critical" | "moderate" | "minor" | "passed" | "review",
                    category: inferCategory(issue.ruleId),
                    page: issue.pageUrl ?? scan.baseUrl,
                    pageTitle: issue.pageTitle ?? "",
                    element: issue.targetJson?.[0] ?? "",
                    wcag: {
                      criterion: (issue.wcagTagsJson ?? []).find((t: string) =>
                        /^wcag\d/.test(t)
                      ) ?? "—",
                      level: (issue.wcagTagsJson ?? []).includes("wcag2aaa")
                        ? "AAA"
                        : (issue.wcagTagsJson ?? []).includes("wcag2aa")
                        ? "AA"
                        : "A",
                      version: "2.2",
                    },
                    whyMatters: issue.description,
                    whoAffects: [],
                    howToFix: "",
                    before: { language: "html", code: "" },
                    after: { language: "html", code: "" },
                    aiExplanation: "",
                    humanReviewRequired: issue.humanReviewRequired,
                    status: "to_review",
                    manualChecks: [],
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <HumanReviewBanner />
          <NoGuaranteeBanner variant="default" />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Scan profile</CardTitle>
              <CardDescription>How this scan was run.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-xs">
                <ProfileRow
                  label="Render profile"
                  value={
                    scanProfile.renderProfile === "real"
                      ? "Real render (styles, fonts, images loaded)"
                      : scanProfile.renderProfile === "minimal"
                      ? "Minimal (styling resources blocked)"
                      : scanProfile.renderProfile === "static-fetch"
                      ? "Static HTML fetch"
                      : "—"
                  }
                />
                <ProfileRow label="Engine" value={formatScanEngine(scanProfile)} />
                <ProfileRow label="Confidence" value={scanProfile.resultConfidence ?? "—"} />
                <ProfileRow label="Viewports" value={scanProfile.viewports ?? scanProfile.viewport ?? "—"} />
                <ProfileRow label="States" value={scanProfile.states ?? "—"} />
                {summary && (
                  <>
                    <ProfileRow label="WCAG findings" value={String(summary.wcagIssueCount)} />
                    <ProfileRow label="Best practices" value={String(summary.bestPracticeIssueCount)} />
                    <ProfileRow label="Manual review" value={String(summary.manualReviewCount)} />
                  </>
                )}
              </dl>
              <p className="text-[11px] text-ink-500 leading-relaxed mt-3 pt-3 border-t border-line/60">
                Automated checks detect roughly 30–50% of accessibility issues.
                Human review is still required — see the checklist on each finding.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-purple-600" aria-hidden /> Pages scanned
              </CardTitle>
              <CardDescription>{pages.length} page(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs">
                {pages.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-line/60 last:border-0">
                    <span className="text-ink-700 truncate font-mono">{p.url}</span>
                    <span className="text-ink-500 shrink-0">{p.statusCode ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function inferCategory(ruleId: string): IssueCategory {
  // Coarse mapping of common axe rules → our UI categories. Anything
  // unmatched falls back to "aria" which is a defensible default for
  // semantic issues.
  if (/color-contrast/.test(ruleId)) return "contrast";
  if (/image-alt|alt-/.test(ruleId)) return "alt-text";
  if (/label/.test(ruleId)) return "form-labels";
  if (/button-name/.test(ruleId)) return "button-names";
  if (/link-name/.test(ruleId)) return "link-names";
  if (/heading/.test(ruleId)) return "heading-structure";
  if (/keyboard/.test(ruleId)) return "keyboard";
  if (/focus/.test(ruleId)) return "focus-visibility";
  if (/landmark|region/.test(ruleId)) return "landmarks";
  if (/html-has-lang|lang/.test(ruleId)) return "language";
  if (/document-title/.test(ruleId)) return "document-title";
  return "aria";
}

function SeverityStat({
  severity,
  count,
}: {
  severity: "critical" | "serious" | "moderate" | "minor";
  count: number;
}) {
  const map = {
    critical: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-50" },
    serious: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-50" },
    moderate: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-50" },
    minor: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-100" },
  };
  return (
    <div className={`flex-1 lg:w-32 rounded-md p-3 ring-1 ${map[severity].bg} ${map[severity].ring}`}>
      <p className={`text-2xl font-semibold tabular-nums ${map[severity].text}`}>{count}</p>
      <p className={`text-[11px] font-medium uppercase tracking-wider ${map[severity].text}`}>{severity}</p>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  severity,
}: {
  label: string;
  count: number;
  active?: boolean;
  severity?: "critical" | "serious" | "moderate" | "minor" | "review";
}) {
  const baseClasses = active
    ? "bg-navy-900 text-paper ring-navy-900"
    : "bg-paper text-ink-700 ring-line hover:bg-canvas-2";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ring-1 min-h-[32px] ${baseClasses}`}
    >
      {severity && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{
            background:
              severity === "critical"
                ? "var(--color-rose-500)"
                : severity === "serious"
                ? "var(--color-amber-500)"
                : severity === "moderate"
                ? "var(--color-amber-500)"
                : severity === "minor"
                ? "var(--color-blue-500)"
                : "var(--color-purple-500)",
          }}
        />
      )}
      {label}
      <span className={`text-[10px] tabular-nums ${active ? "text-paper/80" : "text-ink-500"}`}>
        {count}
      </span>
    </span>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

interface ScanProfile {
  renderProfile: string | null;
  axeVersion: string | null;
  engine: string | null;
  viewport: string | null;
  viewports: string | null;
  states: string | null;
  fallbackMode: boolean;
  resultConfidence: string | null;
}

function readScanProfile(pages: { rawMetadataJson: unknown }[]): ScanProfile {
  for (const p of pages) {
    const m = p.rawMetadataJson;
    if (m && typeof m === "object") {
      const meta = m as Record<string, unknown>;
      const vp = meta.viewport as { width?: number; height?: number } | undefined;
      const viewports = Array.isArray(meta.viewports)
        ? meta.viewports
            .map((item) => {
              const viewport = item as { name?: string; width?: number; height?: number };
              return viewport.name && viewport.width && viewport.height
                ? `${viewport.name} ${viewport.width}×${viewport.height}`
                : null;
            })
            .filter(Boolean)
            .join(", ")
        : null;
      const states = Array.isArray(meta.states)
        ? meta.states.filter((item) => typeof item === "string").join(", ")
        : null;
      return {
        renderProfile:
          typeof meta.renderProfile === "string" ? meta.renderProfile : null,
        axeVersion: typeof meta.axeVersion === "string" ? meta.axeVersion : null,
        engine: typeof meta.engine === "string" ? meta.engine : null,
        viewport:
          vp?.width && vp?.height ? `${vp.width}×${vp.height}` : null,
        viewports: viewports || null,
        states: states || null,
        fallbackMode: meta.fallbackMode === true,
        resultConfidence:
          typeof meta.resultConfidence === "string" ? meta.resultConfidence : null,
      };
    }
  }
  return {
    renderProfile: null,
    axeVersion: null,
    engine: null,
    viewport: null,
    viewports: null,
    states: null,
    fallbackMode: false,
    resultConfidence: null,
  };
}

function formatScanEngine(profile: ScanProfile): string {
  if (profile.engine) return profile.engine;
  return `axe-core${profile.axeVersion ? ` ${profile.axeVersion}` : ""}`;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-500 shrink-0">{label}</dt>
      <dd className="text-ink-800 text-right">{value}</dd>
    </div>
  );
}

type IssueContext = {
  viewport: "desktop" | "mobile";
  state:
    | "initial"
    | "menu-open"
    | "dialog-open"
    | "accordion-open"
    | "tab-open"
    | "form-focus";
};

function legacyScore(counts: {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  review: number;
}): number {
  return Math.max(
    0,
    Math.min(
      100,
      100 -
        counts.critical * 10 -
        counts.serious * 6 -
        counts.moderate * 3 -
        counts.minor -
        counts.review * 2
    )
  );
}

function summarizeContexts(
  issues: Array<{ contextsJson: IssueContext[] | null }>
): {
  desktop: number;
  mobile: number;
  both: number;
  states: Record<IssueContext["state"], number>;
} {
  const summary = {
    desktop: 0,
    mobile: 0,
    both: 0,
    states: {
      initial: 0,
      "menu-open": 0,
      "dialog-open": 0,
      "accordion-open": 0,
      "tab-open": 0,
      "form-focus": 0,
    },
  };
  for (const issue of issues) {
    const contexts = issue.contextsJson ?? [];
    const viewports = new Set(contexts.map((ctx) => ctx.viewport));
    if (viewports.has("desktop")) summary.desktop++;
    if (viewports.has("mobile")) summary.mobile++;
    if (viewports.has("desktop") && viewports.has("mobile")) summary.both++;
    for (const state of new Set(contexts.map((ctx) => ctx.state))) {
      if (state in summary.states) {
        summary.states[state as IssueContext["state"]]++;
      }
    }
  }
  return summary;
}

function ContextLine({ contexts }: { contexts: IssueContext[] }) {
  if (!contexts.length) return null;
  const viewports = Array.from(new Set(contexts.map((ctx) => ctx.viewport))).join(", ");
  const states = Array.from(new Set(contexts.map((ctx) => ctx.state))).join(", ");
  return (
    <p className="text-[11px] text-ink-500 px-1">
      Found on {viewports || "unknown viewport"} · {states || "initial"}
    </p>
  );
}
