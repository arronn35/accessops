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
import { EmptyState } from "@/components/empty/EmptyState";
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
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { ScanReportActions } from "./scan-report-actions";
import { MonitorScanButton } from "./monitor-scan-button";
import {
  buildFindingsFilterHref,
  filterFindings,
  FINDING_STATES,
  formatFindingState,
  parseFindingFilters,
  summarizeFindingContexts,
  type FindingContext,
  type FindingState,
  type SeverityFilter,
  type ViewportFilter,
} from "./finding-filters";

export const metadata = { title: "Scan results — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function ScanResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    sev?: string | string[];
    vp?: string | string[];
    state?: string | string[];
  }>;
}) {
  const { id } = await params;
  const filters = parseFindingFilters(await searchParams);
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
  const failedStoredPageUrls = pages
    .filter((page) => {
      const metadata = page.rawMetadataJson;
      return (
        metadata !== null &&
        typeof metadata === "object" &&
        (metadata as Record<string, unknown>).scanFailed === true
      );
    })
    .map((page) => page.url);
  const failedPageUrls =
    summary?.failedPageUrls ??
    Array.from(new Set(failedStoredPageUrls));
  const pagesIncludedInScore =
    summary?.pageScoresJson.length ??
    Math.max(0, pages.length - failedStoredPageUrls.length);
  const hasFailedPages =
    failedPageJobs.length > 0 ||
    (summary?.pagesFailedToScan ?? failedPageUrls.length) > 0;
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

  const filteredRows = filterFindings(issueRows, filters);
  const isFiltered =
    filters.severity !== "all" ||
    filters.viewport !== "all" ||
    filters.state !== null;

  // Rebuild the group buckets from the filtered set. Counts above the list
  // continue to describe the complete scan rather than shifting with filters.
  const filteredInstancesByGroup = new Map<string, typeof issueRows>();
  for (const row of filteredRows) {
    if (!row.groupId) continue;
    const bucket = filteredInstancesByGroup.get(row.groupId);
    if (bucket) bucket.push(row);
    else filteredInstancesByGroup.set(row.groupId, [row]);
  }
  const filteredGroups = groups.filter((group) =>
    filteredInstancesByGroup.has(group.id)
  );
  const hasGroups =
    filteredGroups.length > 0 && filteredInstancesByGroup.size > 0;
  const topFixes = filteredGroups
    .filter((group) => group.severity !== "review")
    .slice(0, 5);

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
  const contextSummary = summarizeFindingContexts(issueRows);
  // Pulled out of `scan` because the notFound() narrowing above does not
  // carry into the nested closure below.
  const scanId = scan.id;
  const clearFiltersHref = buildFindingsFilterHref(scanId, filters, {
    severity: null,
    viewport: null,
    state: null,
  });

  function filterHref(patch: {
    severity?: SeverityFilter | null;
    viewport?: ViewportFilter | null;
    state?: FindingState | null;
  }) {
    return buildFindingsFilterHref(scanId, filters, patch);
  }

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

      <FailedPagesNotice
        jobs={failedPageJobs}
        failedUrls={failedPageUrls}
        pagesScanned={pagesIncludedInScore}
      />

      <Card>
        <CardContent className="pt-5">
          {scanProfile.fallbackMode && (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
              <p>
                This scan used a degraded static fallback and may miss JavaScript-rendered accessibility issues.
                {fallbackDetail(scanProfile) && (
                  <span className="block mt-1 text-xs">
                    {fallbackDetail(scanProfile)}
                  </span>
                )}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-start">
            <ScanScoreRing score={score} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge tone={hasFailedPages ? "warning" : "success"} size="sm">
                  {hasFailedPages ? "Complete with errors" : "Complete"}
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
                  <strong className="text-ink-900 font-semibold">{pagesIncludedInScore}</strong> scored pages
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
                issues across {pagesIncludedInScore} scored page(s). Critical findings typically reuse patterns
                across many pages, so fixing the top rules often eliminates multiple findings at once.
                {counts.review > 0 &&
                  ` ${counts.review} item(s) need human review where automated checks could not decide.`}
              </p>
            </AiSuggestionBlock>
          )}

          <nav aria-label="Filter findings" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
                <Filter className="size-3.5" aria-hidden /> Severity:
              </span>
              <FilterChip
                href={filterHref({ severity: null })}
                label="All"
                count={issueRows.length}
                active={filters.severity === "all"}
              />
              <FilterChip
                href={filterHref({ severity: "critical" })}
                label="Critical"
                count={counts.critical}
                severity="critical"
                active={filters.severity === "critical"}
              />
              <FilterChip
                href={filterHref({ severity: "serious" })}
                label="Serious"
                count={counts.serious}
                severity="serious"
                active={filters.severity === "serious"}
              />
              <FilterChip
                href={filterHref({ severity: "moderate" })}
                label="Moderate"
                count={counts.moderate}
                severity="moderate"
                active={filters.severity === "moderate"}
              />
              <FilterChip
                href={filterHref({ severity: "minor" })}
                label="Minor"
                count={counts.minor}
                severity="minor"
                active={filters.severity === "minor"}
              />
              <FilterChip
                href={filterHref({ severity: "review" })}
                label="Needs review"
                count={counts.review}
                severity="review"
                active={filters.severity === "review"}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
                <Filter className="size-3.5" aria-hidden /> Viewport:
              </span>
              <FilterChip
                href={filterHref({ viewport: null })}
                label="All"
                count={issueRows.length}
                active={filters.viewport === "all"}
              />
              <FilterChip
                href={filterHref({ viewport: "desktop" })}
                label="Desktop"
                count={contextSummary.desktop}
                active={filters.viewport === "desktop"}
              />
              <FilterChip
                href={filterHref({ viewport: "tablet" })}
                label="Tablet"
                count={contextSummary.tablet}
                active={filters.viewport === "tablet"}
              />
              <FilterChip
                href={filterHref({ viewport: "mobile" })}
                label="Mobile"
                count={contextSummary.mobile}
                active={filters.viewport === "mobile"}
              />
              <FilterChip
                href={filterHref({ viewport: "multiple" })}
                label="Multiple"
                count={contextSummary.multiple}
                active={filters.viewport === "multiple"}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
                <Filter className="size-3.5" aria-hidden /> State:
              </span>
              <FilterChip
                href={filterHref({ state: null })}
                label="All"
                count={issueRows.length}
                active={filters.state === null}
              />
              {FINDING_STATES.map((state) => (
                <FilterChip
                  key={state}
                  href={filterHref({ state })}
                  label={formatFindingState(state)}
                  count={contextSummary.states[state]}
                  active={filters.state === state}
                />
              ))}
            </div>
          </nav>

          <p
            role="status"
            aria-live="polite"
            className="min-h-[1.25rem] text-xs text-ink-600"
          >
            {isFiltered ? (
              <>
                Showing{" "}
                <strong className="font-semibold text-ink-900">
                  {filteredRows.length}
                </strong>{" "}
                of {issueRows.length} findings.{" "}
                <Link
                  href={clearFiltersHref}
                  scroll={false}
                  className="font-medium text-blue-600 underline underline-offset-2"
                >
                  Clear filters
                </Link>
              </>
            ) : (
              <>
                Showing all{" "}
                <strong className="font-semibold text-ink-900">
                  {issueRows.length}
                </strong>{" "}
                findings.
              </>
            )}
          </p>

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
                          {filteredInstancesByGroup.get(g.id)?.length ?? 0} instance
                          {(filteredInstancesByGroup.get(g.id)?.length ?? 0) === 1
                            ? ""
                            : "s"}
                        </span>
                        <span className="block text-[11px] text-ink-500 font-mono">{g.ruleId}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {filteredRows.length === 0 && issueRows.length > 0 ? (
            <EmptyState
              icon={Filter}
              title="No findings match these filters"
              description="Try a different severity, viewport, or state, or clear the filters to see everything."
              action={
                <Link
                  href={clearFiltersHref}
                  scroll={false}
                  className="inline-flex h-10 items-center rounded-md bg-navy-900 px-3.5 text-sm font-medium text-paper hover:bg-navy-800"
                >
                  Clear filters
                </Link>
              }
            />
          ) : hasGroups ? (
            <div className="space-y-2.5">
              {filteredGroups.map((g, idx) => {
                const instances = filteredInstancesByGroup.get(g.id) ?? [];
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
                      affectedCount: instances.length,
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
            <div className="space-y-2.5">{filteredRows.map(renderRow)}</div>
          )}
        </div>

        <aside className="space-y-5">
          <HumanReviewBanner />
          <ManualReviewChecklist scanId={scan.id} />
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
              <CardDescription>
                {pagesIncludedInScore} scored page(s)
                {hasFailedPages ? ` · ${failedPageUrls.length || failedPageJobs.length} not scored` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs">
                {pages.map((p) => {
                  const metadata = p.rawMetadataJson;
                  const scanFailed =
                    metadata !== null &&
                    typeof metadata === "object" &&
                    (metadata as Record<string, unknown>).scanFailed === true;
                  return (
                    <li key={p.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-line/60 last:border-0">
                      <span className="text-ink-700 truncate font-mono">{p.url}</span>
                      <span className={scanFailed ? "text-amber-700 shrink-0" : "text-ink-500 shrink-0"}>
                        {scanFailed ? "Not scored" : p.statusCode ?? "—"}
                      </span>
                    </li>
                  );
                })}
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
  href,
}: {
  label: string;
  count: number;
  active?: boolean;
  severity?: "critical" | "serious" | "moderate" | "minor" | "review";
  href: string;
}) {
  const dotClass =
    severity === "critical"
      ? "bg-rose-500"
      : severity === "serious" || severity === "moderate"
      ? "bg-amber-500"
      : severity === "minor"
      ? "bg-blue-500"
      : severity === "review"
      ? "bg-purple-500"
      : null;

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      aria-label={`${label}: ${count} finding${count === 1 ? "" : "s"}${
        active ? ", selected" : ""
      }`}
      className={cn(
        "inline-flex min-h-[32px] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-navy-900 text-paper ring-navy-900"
          : "bg-paper text-ink-700 ring-line hover:bg-canvas-2 hover:ring-line-strong"
      )}
    >
      {dotClass && (
        <span aria-hidden className={cn("size-1.5 rounded-full", dotClass)} />
      )}
      <span aria-hidden>{label}</span>
      <span
        aria-hidden
        className={cn(
          "text-[10px] tabular-nums",
          active ? "text-paper/80" : "text-ink-500"
        )}
      >
        {count}
      </span>
    </Link>
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
  code: string | null;
  message: string | null;
  fetchFailureReason: string | null;
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
        code: typeof meta.code === "string" ? meta.code : null,
        message: typeof meta.message === "string" ? meta.message : null,
        fetchFailureReason:
          typeof meta.fetchFailureReason === "string"
            ? meta.fetchFailureReason
            : null,
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
    code: null,
    message: null,
    fetchFailureReason: null,
  };
}

function fallbackDetail(profile: ScanProfile): string | null {
  const fetchFailure = profile.fetchFailureReason;
  if (fetchFailure === "bot_challenge_detected") {
    return "The site presented an anti-bot or human-verification challenge, so it was not bypassed.";
  }
  if (fetchFailure?.startsWith("http_")) {
    return `The site returned HTTP ${fetchFailure.slice(5)} to the static scanner.`;
  }
  if (fetchFailure === "request_timeout") {
    return "The static request also timed out.";
  }
  if (fetchFailure) {
    return `Static retrieval could not complete: ${fetchFailure}.`;
  }
  switch (profile.code) {
    case "browser_launch_failed":
      return "Chromium was unavailable, so only the delivered HTML was checked.";
    case "navigation_failed":
      return "Browser navigation failed, so only the delivered HTML was checked.";
    case "axe_failed":
      return "The browser accessibility engine could not finish, so the delivered HTML was checked instead.";
    case "deadline_exceeded":
    case "page_deadline_exceeded":
    case "scan_timeout":
      return "The browser scan exceeded its time budget, so the delivered HTML was checked instead.";
    default:
      return null;
  }
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

function ContextLine({ contexts }: { contexts: FindingContext[] }) {
  if (!contexts.length) return null;
  const viewports = Array.from(new Set(contexts.map((ctx) => ctx.viewport))).join(", ");
  const states = Array.from(new Set(contexts.map((ctx) => ctx.state))).join(", ");
  return (
    <p className="text-[11px] text-ink-500 px-1">
      Found on {viewports || "unknown viewport"} · {states || "initial"}
    </p>
  );
}
