import { profileMismatchReasons, type ComparisonProfile, type ComparisonReason } from "./comparison-profile";
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
 *
 * "Fixed" is an assertion about the world, so it is gated three ways:
 *
 *   1. Identity. rootCauseKey embeds the color pair for contrast rules, so
 *      recoloring #aaaaaa -> #bbbbbb (still failing) changes the key. Matching
 *      therefore falls back to element-set overlap before concluding that a
 *      group disappeared, and the defect is reported as still remaining.
 *   2. Scheme. Keys are only comparable within one FINGERPRINT_VERSION. Across
 *      a boundary the result is `inconclusive`, never `fixed`.
 *   3. Scope. A finding can only be "fixed" if the re-scan actually looked in
 *      the same place and succeeded. Missing URLs or failed pages downgrade
 *      the verdict to `not_observed` — absence of evidence, not evidence of
 *      absence.
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
  /**
   * Normalized selectors covered by this group. Empty for scans persisted
   * before fingerprint v2, which is why the caller also passes a scope
   * carrying the fingerprint version.
   */
  elementKeys?: string[];
}

/**
 * What a scan actually looked at. Without this the diff cannot distinguish
 * "the defect is gone" from "we did not look at the page it was on".
 */
export interface CompareScopeInput {
  profile?: ComparisonProfile | null;
  /** URLs the scan covered. */
  urls: string[];
  /** Pages that errored: their findings are unknown, not absent. */
  failedPageCount: number;
  /** Grouping identity scheme that produced the keys. */
  fingerprintVersion: number | null;
}

export interface CompareCoverage {
  reasons: ComparisonReason[];
  /** URLs present in the before scan that the after scan did not cover. */
  missingFromAfter: string[];
  /** URLs the after scan added, where a finding may be pre-existing. */
  addedInAfter: string[];
  /** Pages the after scan failed to scan. */
  afterFailedPageCount: number;
  /** True when both scans use the same, known identity scheme. */
  identityComparable: boolean;
  /**
   * True when the after scan covered at least the before scan's URLs with no
   * failures. Only then can a disappeared finding be called fixed.
   */
  scopeEquivalent: boolean;
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
  | "regressed"
  /** Gone from the re-scan, but the re-scan did not cover the same ground. */
  | "not_observed"
  /** The two scans use different identity schemes; the diff cannot be trusted. */
  | "inconclusive";

export interface CompareGroupResult {
  verificationStatus: "verification_pending" | "verified_fixed" | "reopened" | "inconclusive";
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
  /**
   * Present before but not after, where the re-scan did not cover the same
   * ground. Deliberately NOT counted as fixed.
   */
  notObserved: CompareGroupResult[];
  /** Groups whose before/after identity schemes do not line up. */
  inconclusive: CompareGroupResult[];
  coverage: CompareCoverage;
  totals: {
    fixed: number;
    new: number;
    remaining: number;
    notObserved: number;
    inconclusive: number;
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
    verificationStatus: status === "fixed" && g.severity !== "review" ? "verified_fixed" : status === "inconclusive" || status === "not_observed" ? "inconclusive" : "verification_pending",
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
 * Compute coverage: whether the after scan looked at the same ground, with the
 * same identity scheme, as the before scan.
 */
function buildCoverage(
  before: CompareScopeInput | null | undefined,
  after: CompareScopeInput | null | undefined
): CompareCoverage {
  // With no scope information we cannot prove equivalence, so we do not claim
  // it. Callers that genuinely have no page data get the conservative verdict.
  if (!before || !after) {
    return {
      reasons: ["PROFILE_MISSING"],
      missingFromAfter: [],
      addedInAfter: [],
      afterFailedPageCount: 0,
      identityComparable: false,
      scopeEquivalent: false,
    };
  }

  const afterUrls = new Set(after.urls);
  const beforeUrls = new Set(before.urls);
  const missingFromAfter = [...beforeUrls].filter((u) => !afterUrls.has(u)).sort();
  const addedInAfter = [...afterUrls].filter((u) => !beforeUrls.has(u)).sort();

  const identityComparable =
    before.fingerprintVersion != null &&
    after.fingerprintVersion != null &&
    before.fingerprintVersion === after.fingerprintVersion;

  const reasons = profileMismatchReasons(before.profile, after.profile);
  if (missingFromAfter.length || addedInAfter.length || !before.urls.length || !after.urls.length) reasons.push("SCOPE_MISMATCH");
  if (before.failedPageCount || after.failedPageCount) reasons.push("FAILED_PAGES");
  if (!identityComparable) reasons.push("FINGERPRINT_VERSION_MISMATCH");
  return {
    reasons: [...new Set(reasons)],
    missingFromAfter,
    addedInAfter,
    afterFailedPageCount: after.failedPageCount,
    identityComparable,
    scopeEquivalent: reasons.length === 0,
  };
}

/** Groups of the same rule whose element sets intersect are the same defect. */
function overlaps(a: CompareGroupInput, b: CompareGroupInput): boolean {
  if (a.ruleId !== b.ruleId) return false;
  const aKeys = a.elementKeys ?? [];
  const bKeys = b.elementKeys ?? [];
  if (!aKeys.length || !bKeys.length) return false;
  const set = new Set(aKeys);
  return bKeys.some((k) => set.has(k));
}

/**
 * Compare a "before" scan to an "after" scan. Both arguments are the
 * issue-group lists + optional score summaries and scan scope for each scan.
 */
export function compareScans(
  before: {
    groups: CompareGroupInput[];
    score?: CompareScoreInput | null;
    scope?: CompareScopeInput | null;
  },
  after: {
    groups: CompareGroupInput[];
    score?: CompareScoreInput | null;
    scope?: CompareScopeInput | null;
  }
): ScanComparison {
  const coverage = buildCoverage(before.scope, after.scope);

  const fixed: CompareGroupResult[] = [];
  const newIssues: CompareGroupResult[] = [];
  const remaining: CompareGroupResult[] = [];
  const manualReview: CompareGroupResult[] = [];
  const notObserved: CompareGroupResult[] = [];
  const inconclusive: CompareGroupResult[] = [];

  let instancesResolved = 0;
  let instancesIntroduced = 0;

  const beforeByKey = new Map(before.groups.map((g) => [g.rootCauseKey, g]));
  const afterByKey = new Map(after.groups.map((g) => [g.rootCauseKey, g]));

  // Manual-review groups are bucketed separately regardless of presence, and
  // never contribute to a fixed/new assertion.
  const reviewKeys = new Set<string>();
  for (const key of new Set([...beforeByKey.keys(), ...afterByKey.keys()])) {
    const b = beforeByKey.get(key);
    const a = afterByKey.get(key);
    if ((b && isReview(b)) || (a && isReview(a))) {
      reviewKeys.add(key);
      const ref = (a ?? b)!;
      const status: CompareStatus = "remaining";
      manualReview.push(
        toResult(ref, b?.affectedCount ?? 0, a?.affectedCount ?? 0, status)
      );
    }
  }

  const pairs: Array<{ b: CompareGroupInput; a: CompareGroupInput }> = [];
  const unmatchedBefore: CompareGroupInput[] = [];
  const matchedAfter = new Set<string>();

  // Pass 1: exact identity.
  for (const b of before.groups) {
    if (reviewKeys.has(b.rootCauseKey)) continue;
    const a = afterByKey.get(b.rootCauseKey);
    if (a) {
      pairs.push({ b, a });
      matchedAfter.add(a.rootCauseKey);
    } else {
      unmatchedBefore.push(b);
    }
  }

  const leftoverAfter = after.groups.filter(
    (a) => !reviewKeys.has(a.rootCauseKey) && !matchedAfter.has(a.rootCauseKey)
  );

  // Pass 2: same rule, overlapping elements. This is what stops a recolored
  // contrast failure from reading as one fixed + one new issue.
  const stillUnmatchedBefore: CompareGroupInput[] = [];
  for (const b of unmatchedBefore) {
    const match = leftoverAfter.find(
      (a) => !matchedAfter.has(a.rootCauseKey) && overlaps(b, a)
    );
    if (match) {
      pairs.push({ b, a: match });
      matchedAfter.add(match.rootCauseKey);
    } else {
      stillUnmatchedBefore.push(b);
    }
  }

  for (const { b, a } of pairs) {
    if (!coverage.identityComparable || !coverage.scopeEquivalent) {
      inconclusive.push(toResult(a, b.affectedCount, a.affectedCount, "inconclusive"));
      continue;
    }
    const delta = a.affectedCount - b.affectedCount;
    const status: CompareStatus =
      delta < 0 ? "improved" : delta > 0 ? "regressed" : "remaining";
    remaining.push(toResult(a, b.affectedCount, a.affectedCount, status));
    if (delta < 0) instancesResolved += -delta;
    else if (delta > 0) instancesIntroduced += delta;
  }

  // Disappeared: fixed only if the scheme matches AND the re-scan covered the
  // same ground successfully.
  for (const b of stillUnmatchedBefore) {
    if (!coverage.identityComparable) {
      inconclusive.push(toResult(b, b.affectedCount, 0, "inconclusive"));
    } else if (!coverage.scopeEquivalent) {
      notObserved.push(toResult(b, b.affectedCount, 0, "not_observed"));
    } else {
      fixed.push(toResult(b, b.affectedCount, 0, "fixed"));
      instancesResolved += b.affectedCount;
    }
  }

  // Appeared: "new" is also an assertion. On a URL the before scan never
  // visited, the finding may simply be pre-existing.
  for (const a of leftoverAfter) {
    if (matchedAfter.has(a.rootCauseKey)) continue;
    if (!coverage.identityComparable) {
      inconclusive.push(toResult(a, 0, a.affectedCount, "inconclusive"));
    } else if (!coverage.scopeEquivalent) {
      notObserved.push(toResult(a, 0, a.affectedCount, "not_observed"));
    } else {
      newIssues.push(toResult(a, 0, a.affectedCount, "new"));
      instancesIntroduced += a.affectedCount;
    }
  }

  fixed.sort(byPriority);
  newIssues.sort(byPriority);
  remaining.sort(byPriority);
  manualReview.sort(byPriority);
  notObserved.sort(byPriority);
  inconclusive.sort(byPriority);

  const score =
    coverage.scopeEquivalent && coverage.identityComparable && before.score && after.score
      ? buildScoreDelta(before.score, after.score)
      : null;

  return {
    fixed,
    newIssues,
    remaining,
    manualReview,
    notObserved,
    inconclusive,
    coverage,
    totals: {
      fixed: fixed.length,
      new: newIssues.length,
      remaining: remaining.length,
      notObserved: notObserved.length,
      inconclusive: inconclusive.length,
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
