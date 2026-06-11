import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import {
  resolveComparison,
  ComparisonError,
  type ComparisonResult,
} from "@/lib/server/compare";
import type { CompareGroupResult } from "@/lib/scanner/compare";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Scan comparison — AccessOps AI" };
export const dynamic = "force-dynamic";

export default async function ScanComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ against?: string }>;
}) {
  const { id } = await params;
  const { against } = await searchParams;
  const ctx = await getCurrentWorkspaceOrRedirect();

  let result: ComparisonResult;
  try {
    result = await resolveComparison(id, against ?? null, ctx.workspace.id);
  } catch (err) {
    if (err instanceof ComparisonError && err.code === "not_found") notFound();
    throw err;
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-[1100px] space-y-6">
      <Link
        href={`/app/scans/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to scan results
      </Link>

      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-ink-900 tracking-tight">
          Before / after comparison
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Root-cause groups diffed between two scans of the same URL.
        </p>
      </div>

      {!result.comparable ? (
        <Card>
          <CardContent className="py-10 text-center">
            <RefreshCw className="size-8 text-ink-300 mx-auto mb-3" aria-hidden />
            <p className="text-sm font-medium text-ink-900">
              No earlier scan to compare against
            </p>
            <p className="text-sm text-ink-600 mt-1 max-w-md mx-auto">
              Re-scan{" "}
              <span className="font-mono text-ink-700">
                {result.after.baseUrl}
              </span>{" "}
              to build a history. Once a second completed scan exists, this page
              shows what was fixed, what is new, and what remains.
            </p>
            <Link
              href="/app/scans/new"
              className="inline-flex items-center gap-2 h-10 px-4 mt-5 rounded-md bg-ink-900 text-paper text-sm font-medium hover:bg-ink-800"
            >
              <RefreshCw className="size-4" aria-hidden /> Run a new scan
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ComparisonBody result={result} />
      )}

      <NoGuaranteeBanner />
    </div>
  );
}

function ComparisonBody({
  result,
}: {
  result: Extract<ComparisonResult, { comparable: true }>;
}) {
  const { before, after, comparison } = result;
  const score = comparison.score;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScanColumn label="Before" scan={before} />
        <ScanColumn label="After" scan={after} />
      </div>

      {score && (
        <Card>
          <CardContent className="py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Accessibility score
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-semibold text-ink-400 tabular-nums">
                  {score.before}
                </span>
                <span className="text-ink-400">→</span>
                <span className="text-3xl font-bold text-ink-900 tabular-nums">
                  {score.after}
                </span>
                <span className="text-sm text-ink-500">
                  ({score.beforeGrade} → {score.afterGrade})
                </span>
              </div>
            </div>
            <DeltaPill direction={score.direction} delta={score.delta} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Fixed"
          value={comparison.totals.fixed}
          tone="green"
          Icon={CheckCircle2}
        />
        <StatTile
          label="New"
          value={comparison.totals.new}
          tone="rose"
          Icon={PlusCircle}
        />
        <StatTile
          label="Remaining"
          value={comparison.totals.remaining}
          tone="amber"
          Icon={Minus}
        />
        <StatTile
          label="Instances resolved"
          value={comparison.totals.instancesResolved}
          tone="green"
          Icon={ArrowDownRight}
        />
      </div>

      <GroupList
        title="Fixed"
        emptyText="No previously-reported groups were resolved."
        groups={comparison.fixed}
        tone="green"
      />
      <GroupList
        title="New issues"
        emptyText="No new root-cause groups were introduced."
        groups={comparison.newIssues}
        tone="rose"
      />
      <GroupList
        title="Remaining"
        emptyText="Nothing carried over from the previous scan."
        groups={comparison.remaining}
        tone="amber"
        showDelta
      />
      {comparison.manualReview.length > 0 && (
        <GroupList
          title="Manual review (not counted as fixed or new)"
          emptyText=""
          groups={comparison.manualReview}
          tone="neutral"
        />
      )}
    </>
  );
}

function ScanColumn({
  label,
  scan,
}: {
  label: string;
  scan: { baseUrl: string; createdAt: Date; completedAt: Date | null };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{label}</span>
          <Badge tone="neutral" size="sm">
            {formatDate(scan.completedAt ?? scan.createdAt)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-ink-700 font-mono break-all">{scan.baseUrl}</p>
      </CardContent>
    </Card>
  );
}

function DeltaPill({
  direction,
  delta,
}: {
  direction: "up" | "down" | "flat";
  delta: number;
}) {
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-2 text-ink-600 text-sm font-medium">
        <Minus className="size-4" aria-hidden /> No change
      </span>
    );
  }
  const up = direction === "up";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
        up ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {up ? (
        <ArrowUpRight className="size-4" aria-hidden />
      ) : (
        <ArrowDownRight className="size-4" aria-hidden />
      )}
      {delta > 0 ? `+${delta}` : delta} points
    </span>
  );
}

const TONE_CLASSES: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  rose: "bg-rose-50 text-rose-700",
  amber: "bg-amber-50 text-amber-700",
  neutral: "bg-canvas-2 text-ink-700",
};

function StatTile({
  label,
  value,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  tone: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg ring-1 ring-line bg-paper p-4">
      <div
        className={`inline-flex items-center justify-center size-8 rounded-md mb-2 ${TONE_CLASSES[tone]}`}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="text-2xl font-semibold text-ink-900 tabular-nums">{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

function GroupList({
  title,
  emptyText,
  groups,
  tone,
  showDelta = false,
}: {
  title: string;
  emptyText: string;
  groups: CompareGroupResult[];
  tone: string;
  showDelta?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <span
            className={`inline-block size-2 rounded-full ${TONE_CLASSES[tone]}`}
            aria-hidden
          />
          {title}
          <Badge tone="neutral" size="sm">
            {groups.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-ink-500">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {groups.map((g) => (
              <li
                key={g.rootCauseKey}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={g.severity} />
                    <span className="text-sm font-medium text-ink-900 truncate">
                      {g.title}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 font-mono mt-1">
                    {g.ruleId}
                    {g.primaryWcagTag ? ` · ${g.primaryWcagTag}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {showDelta ? (
                    <span className="text-xs text-ink-600 tabular-nums">
                      {g.beforeCount} → {g.afterCount}{" "}
                      <span className="text-ink-400">instances</span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-600 tabular-nums">
                      {(g.afterCount || g.beforeCount)} instances
                    </span>
                  )}
                  {showDelta && g.status !== "remaining" && (
                    <span
                      className={`block text-[11px] font-medium ${
                        g.status === "improved"
                          ? "text-green-600"
                          : "text-rose-600"
                      }`}
                    >
                      {g.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
