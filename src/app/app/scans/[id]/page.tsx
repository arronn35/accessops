import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IssueGroupSection } from "@/components/scan/IssueGroupSection";
import {
  AlertTriangle, ArrowLeft, Download, Filter, GitCompare, Globe, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScanScoreRing } from "@/components/scan/ScanScoreRing";
import { FailedPagesNotice } from "@/components/scan/FailedPagesNotice";
import { IssueCard } from "@/components/scan/IssueCard";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { HumanReviewBanner } from "@/components/compliance/HumanReviewBanner";
import { ManualReviewChecklist } from "@/components/compliance/ManualReviewChecklist";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import {
  getScanJob,
  getScanSummary,
  listIssueGroups,
  listIssues,
  listPageJobs,
  listScanPages,
} from "@/lib/data/firestore";
import { type IssueCategory } from "@/lib/mock/issues";
import { formatDate, formatRelative } from "@/lib/utils";
import { ScanReportActions } from "./scan-report-actions";
import { MonitorScanButton } from "./monitor-scan-button";

export const metadata = { title: "Scan results — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function ScanResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentWorkspaceOrRedirect();

  const scan = await getScanJob(ctx.workspace.id, id);

  if (!scan) notFound();
  if (scan.status !== "completed") {
    redirect(`/app/scans/${id}/progress`);
  }

  const [issues, pages, summary, groups, pageJobs] = await Promise.all([
    listIssues(ctx.workspace.id, scan.id),
    listScanPages(ctx.workspace.id, scan.id),
    getScanSummary(ctx.workspace.id, scan.id),
    listIssueGroups(ctx.workspace.id, scan.id),
    scan.usePageJobs ? listPageJobs(ctx.workspace.id, scan.id) : Promise.resolve([]),
  ]);
  const failedPageJobs = pageJobs.filter((job) => job.status === "failed");
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const issueRows = issues.map((issue) => {
    const page = issue.scanPageId ? pageById.get(issue.scanPageId) : null;
    return {
      ...issue,
      pageUrl: page?.url ?? null,
      pageTitle: page?.title ?? null,
      evidenceStatus: null,
      evidenceDeletedAt: null,
      evidenceExpiresAt: null,
      evidenceKey: null,
    };
  });

  // Bucket each finding under its root-cause group. Findings without a
  // groupId (legacy scans run before grouping shipped) fall back to the flat
  // list rendered below.
  const instancesByGroup = new Map<string, typeof issueRows>();
  for (const row of issueRows) {
    if (!row.groupId) continue;
    const bucket = instancesByGroup.get(row.groupId);
    if (bucket) bucket.push(row);
    else instancesByGroup.set(row.groupId, [row]);
  }
  const hasGroups = groups.length > 0 && instancesByGroup.size > 0;
  const topFixes = groups.filter((g) => g.severity !== "review").slice(0, 5);

  const scanProfile = readScanProfile(pages.map((page) => ({ rawMetadataJson: page.rawMetadataJson ?? null })));

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
  const contextSummary = summarizeContexts(issueRows.map((issue) => ({ contextsJson: issue.contextsJson ?? null })));

  const renderRow = (issue: (typeof issueRows)[number]) => (
    <div key={issue.id} className="space-y-1">
      <ContextLine contexts={issue.contextsJson ?? []} />
      <IssueCard
        scanId={scan.id}
        evidenceAvailable={false}
        issue={{
          id: issue.id,
          title: issue.help,
          severity: issue.severity as "critical" | "moderate" | "minor" | "passed" | "review",
          category: inferCategory(issue.ruleId),
          page: issue.pageUrl ?? scan.baseUrl,
          pageTitle: issue.pageTitle ?? "",
          element: issue.targetJson?.[0] ?? "",
          wcag: {
            criterion:
              (issue.wcagTagsJson ?? []).find((t: string) => /^wcag\d/.test(t)) ?? "—",
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
  );

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Dashboard
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/app/scans/${scan.id}/compare`}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
          >
            <GitCompare className="size-4" aria-hidden /> Compare
          </Link>
          <MonitorScanButton scanId={scan.id} />
          <Link
            href={`/api/scans/${scan.id}/issues?format=csv`}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
          >
            <Download className="size-4" aria-hidden /> Export issues
          </Link>
          <ScanReportActions scanId={scan.id} />
        </div>
      </div>

      <FailedPagesNotice jobs={failedPageJobs} pagesScanned={scan.pagesScanned} />

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
                <Badge tone={failedPageJobs.length > 0 ? "warning" : "success"} size="sm">
                  {failedPageJobs.length > 0 ? "Complete with errors" : "Complete"}
                </Badge>
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
            <FilterChip label="Tablet" count={contextSummary.tablet} />
            <FilterChip label="Mobile" count={contextSummary.mobile} />
            <FilterChip label="Multiple" count={contextSummary.both} />
            <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700 ml-2">
              State:
            </span>
            {Object.entries(contextSummary.states).map(([state, count]) => (
              <FilterChip key={state} label={state} count={count} />
            ))}
          </div>

          {hasGroups && topFixes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top priority fixes</CardTitle>
                <CardDescription>
                  Ordered by impact — fixing these root causes clears the most findings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {topFixes.map((g, idx) => (
                    <li key={g.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 size-5 shrink-0 rounded-full bg-navy-900 text-paper text-[11px] font-semibold grid place-items-center tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-ink-900">{g.title}</span>
                        <span className="ml-2 text-[11px] text-ink-500 tabular-nums">
                          {g.affectedCount} instance{g.affectedCount === 1 ? "" : "s"}
                        </span>
                        <span className="block text-[11px] text-ink-500 font-mono">{g.ruleId}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {hasGroups ? (
            <div className="space-y-2.5">
              {groups.map((g, idx) => {
                const instances = instancesByGroup.get(g.id) ?? [];
                if (!instances.length) return null;
                return (
                  <IssueGroupSection
                    key={g.id}
                    defaultOpen={idx === 0}
                    group={{
                      id: g.id,
                      title: g.title,
                      ruleId: g.ruleId,
                      severity: g.severity as
                        | "critical"
                        | "moderate"
                        | "minor"
                        | "passed"
                        | "review",
                      affectedCount: g.affectedCount,
                      primaryWcagTag: g.primaryWcagTag,
                      recommendedFix: g.recommendedFix,
                    }}
                  >
                    {instances.map(renderRow)}
                  </IssueGroupSection>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">{issueRows.map(renderRow)}</div>
          )}
        </div>

        <aside className="space-y-5">
          <HumanReviewBanner />
          <ManualReviewChecklist />
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
  viewport: "desktop" | "tablet" | "mobile";
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
  tablet: number;
  mobile: number;
  both: number;
  states: Record<IssueContext["state"], number>;
} {
  const summary = {
    desktop: 0,
    tablet: 0,
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
    if (viewports.has("tablet")) summary.tablet++;
    if (viewports.has("mobile")) summary.mobile++;
    if (viewports.size > 1) summary.both++;
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
