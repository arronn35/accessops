import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, Printer, ScanLine, ShieldCheck } from "lucide-react";
import { ScanScoreRing } from "@/components/scan/ScanScoreRing";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { Logo } from "@/components/brand/Logo";
import { db } from "@/lib/db";
import { scanJobs, scanPages, accessibilityIssues } from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Report preview — AccessOps AI" };
export const dynamic = "force-dynamic";

type Severity = "critical" | "moderate" | "minor" | "passed" | "review";

export default async function ReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scanId?: string }>;
}) {
  const { scanId } = await searchParams;
  const ctx = await getCurrentWorkspaceOrRedirect();

  // Selected scan, or the most recent completed scan in the workspace.
  const [scan] = scanId
    ? await db
        .select()
        .from(scanJobs)
        .where(
          and(
            eq(scanJobs.id, scanId),
            eq(scanJobs.workspaceId, ctx.workspace.id),
            eq(scanJobs.status, "completed")
          )
        )
        .limit(1)
    : await db
        .select()
        .from(scanJobs)
        .where(
          and(
            eq(scanJobs.workspaceId, ctx.workspace.id),
            eq(scanJobs.status, "completed")
          )
        )
        .orderBy(desc(scanJobs.completedAt))
        .limit(1);

  if (!scan) {
    return <EmptyState />;
  }

  const issues = await db
    .select({
      id: accessibilityIssues.id,
      severity: accessibilityIssues.severity,
      help: accessibilityIssues.help,
      wcagTagsJson: accessibilityIssues.wcagTagsJson,
      pageUrl: scanPages.url,
    })
    .from(accessibilityIssues)
    .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
    .where(eq(accessibilityIssues.scanJobId, scan.id))
    .orderBy(asc(accessibilityIssues.severity));

  const counts = { critical: 0, moderate: 0, minor: 0, review: 0, passed: 0 };
  for (const i of issues) counts[i.severity as keyof typeof counts]++;

  const score = Math.max(
    0,
    Math.min(
      100,
      100 - counts.critical * 6 - counts.moderate * 3 - counts.minor - counts.review
    )
  );

  const scanDate = scan.completedAt ?? scan.startedAt ?? scan.createdAt;
  const host = hostFromUrl(scan.baseUrl);

  return (
    <div className="bg-canvas-2 min-h-full pb-20">
      {/* Action bar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line px-4 lg:px-8 h-14 flex items-center justify-between">
        <Link
          href={`/app/reports/builder?scanId=${scan.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to builder
        </Link>
        <Link
          href={`/app/reports/builder?scanId=${scan.id}`}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
        >
          <Printer className="size-4" aria-hidden /> Build &amp; export
        </Link>
      </div>

      <div className="mx-auto max-w-3xl bg-paper my-8 shadow-[var(--shadow-card)] rounded-lg overflow-hidden">
        {/* Cover */}
        <section className="bg-navy-900 text-paper px-10 py-12">
          <div className="flex items-start justify-end gap-4 mb-12">
            <Logo variant="wordmark-light" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-paper/60 mb-3 font-semibold">
            Accessibility assessment
          </p>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight leading-tight">
            {host} — {formatDate(scanDate)} scan
          </h1>
          <p className="text-paper/70 mt-4 max-w-md">
            Prepared by {ctx.workspace.name} using maitrico AccessOps AI. {scan.pagesScanned}{" "}
            page(s) audited against WCAG 2.2 AA-oriented automated checks.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
            <CoverStat label="Pages scanned" value={`${scan.pagesScanned}`} />
            <CoverStat label="Findings" value={`${issues.length}`} />
            <CoverStat label="Date" value={formatDate(scanDate)} />
          </div>
        </section>

        {/* Executive summary */}
        <Section title="1. Executive summary">
          <div className="flex items-start gap-6">
            <ScanScoreRing score={score} size="lg" />
            <p className="text-sm text-ink-700 leading-relaxed flex-1">
              AccessOps AI scanned {scan.pagesScanned} page(s) of {host} against WCAG 2.2
              AA-oriented checks via axe-core. The scan surfaced {issues.length} automated
              finding(s): {counts.critical} critical, {counts.moderate} moderate,{" "}
              {counts.minor} minor, and {counts.review} needing human review.
              Critical findings typically share patterns across pages, so fixing the top rules
              often resolves several findings at once.
            </p>
          </div>
        </Section>

        {/* Scope & limitations */}
        <Section title="2. Scan scope &amp; limitations">
          <ul className="space-y-2 text-sm text-ink-700 list-disc pl-5">
            <li>Pages scanned: {scan.pagesScanned}</li>
            <li>Standard: WCAG 2.2 AA-oriented (axe-core ruleset)</li>
            <li>
              Automated tools detect roughly 30–50% of accessibility issues; qualified human
              review remains required.
            </li>
            <li>Authenticated pages and issues that require manual inspection were not covered.</li>
          </ul>
        </Section>

        {/* Findings table */}
        <Section title="3. Findings detail">
          {issues.length === 0 ? (
            <p className="text-sm text-ink-600">
              Automated checks did not surface any findings. Human review may still uncover
              issues.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-ink-500 uppercase tracking-wider border-b border-line">
                      <th className="pb-2.5 pr-3">Severity</th>
                      <th className="pb-2.5 pr-3">Finding</th>
                      <th className="pb-2.5 pr-3">WCAG</th>
                      <th className="pb-2.5">Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {issues.slice(0, 12).map((i) => (
                      <tr key={i.id}>
                        <td className="py-2.5 pr-3 align-top">
                          <SeverityBadge severity={i.severity as Severity} size="sm" />
                        </td>
                        <td className="py-2.5 pr-3 text-ink-900 leading-snug">{i.help}</td>
                        <td className="py-2.5 pr-3 align-top">
                          <span className="font-mono text-[11px] text-ink-700">
                            {(i.wcagTagsJson ?? []).find((t) => /^wcag\d/.test(t)) ?? "—"}
                          </span>
                        </td>
                        <td className="py-2.5 align-top">
                          <span className="font-mono text-[11px] text-ink-500 break-all">
                            {i.pageUrl ? hostFromUrl(i.pageUrl) : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {issues.length > 12 && (
                <p className="text-xs text-ink-500 mt-3">
                  Showing 12 of {issues.length} findings. The full list is included in the
                  HTML and CSV exports.
                </p>
              )}
            </>
          )}
        </Section>

        {/* Disclaimer */}
        <section className="px-10 py-8 bg-canvas-2 border-t border-line">
          <div className="flex items-start gap-3">
            <span className="size-9 rounded-md bg-navy-900 text-paper inline-flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink-900 mb-1">Disclaimer</h3>
              <p className="text-xs text-ink-700 leading-relaxed">{COMPLIANCE_COPY.REPORT_NOT_LEGAL}</p>
              <p className="text-xs text-ink-700 leading-relaxed mt-2">{COMPLIANCE_COPY.AUTOMATED_LIMITATIONS}</p>
            </div>
          </div>
        </section>

        <footer className="px-10 py-5 text-[11px] text-ink-500 flex items-center justify-between">
          <span>Prepared with maitrico AccessOps AI</span>
          <span className="font-mono">{scan.id}</span>
        </footer>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-canvas-2 min-h-full px-4 lg:px-8 py-16">
      <div className="mx-auto max-w-md bg-paper rounded-lg ring-1 ring-line p-8 text-center">
        <span className="size-12 rounded-md bg-canvas-2 inline-flex items-center justify-center mx-auto">
          <ScanLine className="size-5 text-ink-500" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-ink-900 mt-4">No completed scans yet</h1>
        <p className="text-sm text-ink-600 mt-2 leading-relaxed">
          A report preview is generated from a completed scan. Run your first scan to see a
          client-ready report here.
        </p>
        <Link
          href="/app/scans/new"
          className="inline-flex items-center gap-2 mt-5 h-10 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
        >
          <ScanLine className="size-4" aria-hidden /> Start a scan
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-10 py-8 border-t border-line">
      <h2 className="text-base font-semibold text-ink-900 tracking-tight mb-4">{title}</h2>
      {children}
    </section>
  );
}

function CoverStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-paper/60 font-semibold">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
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
