/**
 * Before/after scan comparison.
 *
 * Pure module (no DB, no I/O) so it is trivially unit-testable. The API
 * route loads two scans' issue groups + score summaries and hands them
 * here. We diff by `rootCauseKey` — the stable identity Phase 3's grouping
 * assigns to each distinct root cause — so a finding that moved DOM nodes
 * or changed instance count is still recognised as the "same" issue.
 *
 * Manual-review groups (`severity === "review"`) are reported in their own
 * bucket and never counted as confirmed fixed/new violations, matching the
 * product guardrail that human-review items are not pass/fail assertions.
 */

export type CompareSeverity =
  | "critical"
  | "moderate"
  | "minor"
  | "review"
  | "passed";

export interface CompareGroupInput {
  rootCauseKey: string;
  ruleId: string;
  title: string;
  severity: CompareSeverity;
  affectedCount: number;
  primaryWcagTag: string | null;
  priority: number;
}

export interface CompareScoreInput {
  overallScore: number;
  grade: string;
  riskLevel: string;
  manualReviewCount: number;
}

export type CompareStatus =
  | "fixed"
  | "new"
  | "remaining"
  | "improved"
  | "regressed";

export interface CompareGroupResult {
  rootCauseKey: string;
  ruleId: string;
  title: string;
  severity: CompareSeverity;
  primaryWcagTag: string | null;
  priority: number;
  beforeCount: number;
  afterCount: number;
  status: CompareStatus;
}

export interface ScanComparison {
  /** Confirmed-violation groups present before but gone after. */
  fixed: CompareGroupResult[];
  /** Confirmed-violation groups present after but not before. */
  newIssues: CompareGroupResult[];
  /** Confirmed-violation groups present in both scans. */
  remaining: CompareGroupResult[];
  /** Manual-review groups in either scan (kept out of fixed/new/remaining). */
  manualReview: CompareGroupResult[];
  totals: {
    fixed: number;
    new: number;
    remaining: number;
    /** Sum of affected instances removed across fixed + improved groups. */
    instancesResolved: number;
    /** Sum of affected instances added across new + regressed groups. */
    instancesIntroduced: number;
  };
  score: {
    before: number;
    after: number;
    delta: number;
    beforeGrade: string;
    afterGrade: string;
    direction: "up" | "down" | "flat";
  } | null;
}

function isReview(g: CompareGroupInput): boolean {
  return g.severity === "review";
}

function toResult(
  g: CompareGroupInput,
  beforeCount: number,
  afterCount: number,
  status: CompareStatus
): CompareGroupResult {
  return {
    rootCauseKey: g.rootCauseKey,
    ruleId: g.ruleId,
    title: g.title,
    severity: g.severity,
    primaryWcagTag: g.primaryWcagTag,
    priority: g.priority,
    beforeCount,
    afterCount,
    status,
  };
}

const byPriority = (a: CompareGroupResult, b: CompareGroupResult) =>
  a.priority - b.priority || b.afterCount - a.afterCount;

/**
 * Compare a "before" scan to an "after" scan. Both arguments are the
 * issue-group lists + optional score summaries for each scan.
 */
export function compareScans(
  before: { groups: CompareGroupInput[]; score?: CompareScoreInput | null },
  after: { groups: CompareGroupInput[]; score?: CompareScoreInput | null }
): ScanComparison {
  const beforeByKey = new Map(before.groups.map((g) => [g.rootCauseKey, g]));
  const afterByKey = new Map(after.groups.map((g) => [g.rootCauseKey, g]));

  const fixed: CompareGroupResult[] = [];
  const newIssues: CompareGroupResult[] = [];
  const remaining: CompareGroupResult[] = [];
  const manualReview: CompareGroupResult[] = [];

  let instancesResolved = 0;
  let instancesIntroduced = 0;

  // Walk the union of keys deterministically.
  const allKeys = new Set<string>([
    ...beforeByKey.keys(),
    ...afterByKey.keys(),
  ]);

  for (const key of allKeys) {
    const b = beforeByKey.get(key);
    const a = afterByKey.get(key);

    // Manual-review groups are bucketed separately regardless of presence.
    if ((b && isReview(b)) || (a && isReview(a))) {
      const ref = (a ?? b)!;
      const status: CompareStatus = !b ? "new" : !a ? "fixed" : "remaining";
      manualReview.push(
        toResult(ref, b?.affectedCount ?? 0, a?.affectedCount ?? 0, status)
      );
      continue;
    }

    if (b && !a) {
      fixed.push(toResult(b, b.affectedCount, 0, "fixed"));
      instancesResolved += b.affectedCount;
    } else if (!b && a) {
      newIssues.push(toResult(a, 0, a.affectedCount, "new"));
      instancesIntroduced += a.affectedCount;
    } else if (b && a) {
      const delta = a.affectedCount - b.affectedCount;
      const status: CompareStatus =
        delta < 0 ? "improved" : delta > 0 ? "regressed" : "remaining";
      remaining.push(toResult(a, b.affectedCount, a.affectedCount, status));
      if (delta < 0) instancesResolved += -delta;
      else if (delta > 0) instancesIntroduced += delta;
    }
  }

  fixed.sort(byPriority);
  newIssues.sort(byPriority);
  remaining.sort(byPriority);
  manualReview.sort(byPriority);

  const score =
    before.score && after.score
      ? buildScoreDelta(before.score, after.score)
      : null;

  return {
    fixed,
    newIssues,
    remaining,
    manualReview,
    totals: {
      fixed: fixed.length,
      new: newIssues.length,
      remaining: remaining.length,
      instancesResolved,
      instancesIntroduced,
    },
    score,
  };
}

function buildScoreDelta(
  before: CompareScoreInput,
  after: CompareScoreInput
): NonNullable<ScanComparison["score"]> {
  const delta = after.overallScore - before.overallScore;
  return {
    before: before.overallScore,
    after: after.overallScore,
    delta,
    beforeGrade: before.grade,
    afterGrade: after.grade,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}
