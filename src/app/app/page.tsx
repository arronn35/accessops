import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowUpRight, Plus, AlertOctagon, AlertTriangle, Info, FileCheck2, Activity, Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScanScoreRing } from "@/components/scan/ScanScoreRing";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { AiSuggestionBlock } from "@/components/ai/AiSuggestionBlock";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { EmptyState } from "@/components/empty/EmptyState";
import { ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import {
  scanJobs,
  accessibilityIssues,
  scanSummaries,
} from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Dashboard — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();

  const recentScans = await db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.workspaceId, ctx.workspace.id))
    .orderBy(desc(scanJobs.createdAt))
    .limit(5);

  const latest = recentScans[0];
  const openIssuesRaw = latest
    ? await db
        .select({
          id: accessibilityIssues.id,
          ruleId: accessibilityIssues.ruleId,
          severity: accessibilityIssues.severity,
          help: accessibilityIssues.help,
        })
        .from(accessibilityIssues)
        .where(eq(accessibilityIssues.scanJobId, latest.id))
        .orderBy(desc(accessibilityIssues.severity))
        .limit(5)
    : [];

  const counts = { critical: 0, moderate: 0, minor: 0, review: 0, passed: 0 };
  let latestSummary: typeof scanSummaries.$inferSelect | null = null;
  if (latest) {
    const sevRows = await db
      .select({
        severity: accessibilityIssues.severity,
        count: sql<number>`count(*)::int`,
      })
      .from(accessibilityIssues)
      .where(eq(accessibilityIssues.scanJobId, latest.id))
      .groupBy(accessibilityIssues.severity);
    for (const row of sevRows) {
      counts[row.severity as keyof typeof counts] = row.count;
    }
    [latestSummary] = await db
      .select()
      .from(scanSummaries)
      .where(eq(scanSummaries.scanJobId, latest.id))
      .limit(1);
  }

  const total = counts.critical + counts.moderate + counts.minor + counts.review;
  const score = latest ? latestSummary?.overallScore ?? legacyScore(counts) : null;

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
            Workspace · {ctx.workspace.name}
          </p>
          <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
            {greeting()}, {ctx.user.name?.split(" ")[0] ?? ctx.user.email?.split("@")[0]}
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            {latest
              ? `Latest scan: ${hostFromUrl(latest.baseUrl)}.`
              : "Run your first scan to start tracking accessibility issues."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latest && (
            <Link
              href={`/app/reports/builder?scanId=${latest.id}`}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
            >
              <FileCheck2 className="size-4" aria-hidden /> Build report
            </Link>
          )}
          <Link
            href="/app/scans/new"
            className="inline-flex items-center gap-2 h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> New scan
          </Link>
        </div>
      </div>

      {!latest ? (
        <EmptyState
          icon={ScanLine}
          title="No scans yet"
          description="Start your first scan to see findings, AI-assisted explanations, and a remediation plan."
          action={
            <Link
              href="/app/scans/new"
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> Start a scan
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Latest scan</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="font-mono text-xs">{hostFromUrl(latest.baseUrl)}</span>
                  <span className="text-ink-400">·</span>
                  <span>{latest.pagesScanned} pages</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  {score !== null && <ScanScoreRing score={score} size="lg" />}
                  <div className="space-y-2">
                    <Badge
                      tone={
                        latest.status === "completed"
                          ? "success"
                          : latest.status === "running" || latest.status === "queued"
                          ? "info"
                          : "danger"
                      }
                    >
                      {latest.status}
                    </Badge>
                    <p className="text-xs text-ink-600 leading-relaxed max-w-[180px]">
                      Risk score reflects automated findings only. Lower-risk doesn&apos;t mean compliant.
                    </p>
                    <Link
                      href={`/app/scans/${latest.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Open scan results <ArrowUpRight className="size-3" aria-hidden />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={<AlertOctagon className="size-4" aria-hidden />} label="Critical" value={counts.critical} tone="rose" />
              <KpiCard icon={<AlertTriangle className="size-4" aria-hidden />} label="Moderate" value={counts.moderate} tone="amber" />
              <KpiCard icon={<Info className="size-4" aria-hidden />} label="Minor" value={counts.minor} tone="blue" />
              <KpiCard icon={<Activity className="size-4" aria-hidden />} label="Pages" value={latest.pagesScanned} tone="navy" />

              <Card className="col-span-2 sm:col-span-4 p-5">
                <h3 className="text-sm font-semibold text-ink-900">Open findings ({total})</h3>
                <p className="text-xs text-ink-600 mt-0.5">Latest scan</p>
                {openIssuesRaw.length === 0 ? (
                  <p className="text-sm text-ink-600 mt-3">No automated findings. Human review may still uncover issues.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {openIssuesRaw.map((i) => (
                      <li key={i.id}>
                        <Link
                          href={`/app/scans/${latest.id}/issues/${i.id}`}
                          className="flex items-center gap-2 p-2 -mx-2 rounded hover:bg-canvas-2"
                        >
                          <SeverityBadge severity={i.severity as "critical" | "moderate" | "minor" | "review" | "passed"} size="sm" />
                          <span className="text-sm text-ink-900 line-clamp-1">{i.help}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <AiSuggestionBlock title="AI summary">
                <p>
                  {ctx.privacy?.aiProcessingEnabled
                    ? `Latest scan of ${hostFromUrl(latest.baseUrl)} surfaced ${total} automated findings. ${counts.critical} critical, ${counts.moderate} moderate. Critical findings typically share patterns across many pages — fixing the top rule often eliminates multiple findings.`
                    : `AI processing is disabled. Enable it in Privacy & Compliance Center to receive a plain-language summary and remediation guidance per finding.`}
                </p>
              </AiSuggestionBlock>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-600" aria-hidden /> Compliance risk overview
                </CardTitle>
                <CardDescription>What this score does and doesn&apos;t mean.</CardDescription>
              </CardHeader>
              <CardContent>
                <NoGuaranteeBanner variant="compact" />
                <ul className="mt-4 space-y-2.5 text-xs text-ink-700 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="size-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" aria-hidden />
                    Risk score reflects automated WCAG 2.2 AA-oriented findings only.
                  </li>
                  <li className="flex gap-2">
                    <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" aria-hidden />
                    Automated scanning catches ~30–50% of accessibility issues. Human review remains required.
                  </li>
                  <li className="flex gap-2">
                    <span className="size-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" aria-hidden />
                    This score is not a legal certification under ADA, EAA, or Section 508.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-500 uppercase tracking-wider">
                      <th className="pb-2 font-medium">URL</th>
                      <th className="pb-2 font-medium">Pages</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">When</th>
                      <th className="pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentScans.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 font-mono text-xs text-ink-700 truncate max-w-[280px]">{s.baseUrl}</td>
                        <td className="py-3 text-ink-700">{s.pagesScanned}</td>
                        <td className="py-3">
                          <Badge
                            tone={
                              s.status === "completed"
                                ? "success"
                                : s.status === "failed"
                                ? "danger"
                                : "info"
                            }
                            size="sm"
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-ink-600">{formatRelative(s.createdAt)}</td>
                        <td className="py-3 text-right">
                          <Link
                            href={
                              s.status === "completed"
                                ? `/app/scans/${s.id}`
                                : `/app/scans/${s.id}/progress`
                            }
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function legacyScore(counts: {
  critical: number;
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
        counts.moderate * 3 -
        counts.minor -
        counts.review * 2
    )
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "rose" | "amber" | "blue" | "navy";
}) {
  const toneClasses: Record<typeof tone, { iconBg: string; iconText: string; valueText: string }> = {
    rose: { iconBg: "bg-rose-50", iconText: "text-rose-500", valueText: "text-rose-700" },
    amber: { iconBg: "bg-amber-50", iconText: "text-amber-500", valueText: "text-amber-700" },
    blue: { iconBg: "bg-blue-50", iconText: "text-blue-500", valueText: "text-blue-700" },
    navy: { iconBg: "bg-navy-900", iconText: "text-paper", valueText: "text-ink-900" },
  };
  const t = toneClasses[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`size-8 rounded-md inline-flex items-center justify-center ${t.iconBg} ${t.iconText}`}
        >
          {icon}
        </span>
      </div>
      <p className={`text-2xl font-semibold tabular-nums ${t.valueText}`}>{value}</p>
      <p className="text-xs text-ink-600 mt-0.5">{label}</p>
    </Card>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
