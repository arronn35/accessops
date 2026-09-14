import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
  Minus,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "@/components/scan/SeverityBadge";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import { requirePagePermission } from "@/lib/server/workspace";
import {
  resolveComparison,
  ComparisonError,
  type ComparisonResult,
} from "@/lib/server/compare";
import type { CompareGroupResult, ScanComparison } from "@/lib/scanner/compare";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Scan comparison — Percevia AI" };
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
  const ctx = await requirePagePermission("view_scans");

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
              {result.verificationStatus === "verification_pending" ? "Verification pending" : "Comparison inconclusive"}
            </p>
            <p className="text-sm text-ink-600 mt-1 max-w-md mx-auto">
              A verified result requires two completed scans with matching scope, engine, viewport and scoring settings.

            </p>
            <ul className="mt-3 text-sm text-ink-700" aria-label="Comparison reasons">
              {result.reasons.map((reason) => <li key={reason}>{reason.replaceAll("_", " ").toLowerCase()}</li>)}
            </ul>
            {result.before && <p className="mt-3 text-xs text-ink-600">Missing URLs: {result.before.scope.urls.filter((url) => !result.after.scope.urls.includes(url)).join(", ") || "None"}</p>}
            <details className="mt-4 text-left text-xs text-ink-700">
              <summary className="cursor-pointer text-center">Scan scope and engine profile</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-ink-50 p-3">{JSON.stringify({ before: result.before?.profile ?? null, after: result.after.profile }, null, 2)}</pre>
            </details>
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
              </div>
            </div>
            <DeltaPill direction={score.direction} delta={score.delta} />
          </CardContent>
        </Card>
      )}

      <CoverageNotice coverage={comparison.coverage} />

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
      {comparison.notObserved.length > 0 && (
        <GroupList
          title="Not observed in the re-scan (not counted as fixed)"
          emptyText=""
          groups={comparison.notObserved}
          tone="neutral"
        />
      )}
      {comparison.inconclusive.length > 0 && (
        <GroupList
          title="Inconclusive (scans use different grouping versions)"
          emptyText=""
          groups={comparison.inconclusive}
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

/**
 * Says out loud why a verdict is being withheld. Without this the page shows
 * "Fixed 0" when the truth is "we could not check" — the exact confusion the
 * not_observed / inconclusive buckets exist to prevent.
 */
function CoverageNotice({
  coverage,
}: {
  coverage: ScanComparison["coverage"];
}) {
  if (coverage.identityComparable && coverage.scopeEquivalent && !coverage.addedInAfter.length) {
    return null;
  }

  const reasons: string[] = [];
  if (!coverage.identityComparable) {
    reasons.push(
      "The two scans were grouped by different versions of the finding-identity scheme, so findings cannot be matched reliably."
    );
  }
  if (coverage.missingFromAfter.length) {
    reasons.push(
      `The re-scan did not cover ${coverage.missingFromAfter.length} page(s) the earlier scan did, so findings there could not be re-checked.`
    );
  }
  if (coverage.afterFailedPageCount > 0) {
    reasons.push(
      `${coverage.afterFailedPageCount} page(s) failed to scan, so their findings are unknown rather than resolved.`
    );
  }
  if (coverage.addedInAfter.length) {
    reasons.push(
      `The re-scan covered ${coverage.addedInAfter.length} page(s) the earlier scan did not, so findings there may be pre-existing rather than new.`
    );
  }

  return (
    <AlertCallout tone="warning" title="Limited comparison" icon={HelpCircle}>
      <ul className="list-disc pl-5 space-y-1">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </AlertCallout>
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
                      {g.title}{g.verificationStatus === "reopened" && <span className="ml-2 text-rose-700">(Reopened)</span>}
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
