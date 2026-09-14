import { describe, it, expect } from "vitest";
import {
  compareScans,
  type CompareGroupInput,
  type CompareScopeInput,
  type CompareScoreInput,
} from "./compare";
import { buildComparisonProfile } from "./comparison-profile";
import { FINGERPRINT_VERSION } from "./grouping";

function g(
  key: string,
  over: Partial<CompareGroupInput> = {}
): CompareGroupInput {
  return {
    rootCauseKey: key,
    ruleId: over.ruleId ?? "color-contrast",
    title: over.title ?? key,
    severity: over.severity ?? "moderate",
    affectedCount: over.affectedCount ?? 1,
    primaryWcagTag: over.primaryWcagTag ?? "wcag143",
    priority: over.priority ?? 30,
    elementKeys: over.elementKeys ?? [`el:${key}`],
  };
}

/**
 * Equivalent scope: same URLs, no failed pages, same identity scheme. Only
 * under these conditions may the diff assert "fixed" — so every test that
 * expects a fixed/new verdict has to say so explicitly.
 */
const SCOPE: CompareScopeInput = {
  profile: buildComparisonProfile([{ url: "https://example.com/", title: null, statusCode: 200, scannedAt: new Date(), issues: [], rawMetadata: { engine: "playwright-axe", scannerVersion: "v1", axeVersion: "4.11", playwrightVersion: "1.60", viewports: ["desktop"], renderProfile: "real", userAgent: "test", locale: "en-US" } }]),
  urls: ["https://example.com/"],
  failedPageCount: 0,
  fingerprintVersion: FINGERPRINT_VERSION,
};
const scoped = (groups: CompareGroupInput[], sc?: CompareScoreInput | null) => ({
  groups,
  score: sc,
  scope: SCOPE,
});

const score = (overall: number, grade: string): CompareScoreInput => ({
  overallScore: overall,
  grade,
  riskLevel: "medium",
  manualReviewCount: 0,
});

describe("compareScans", () => {
  it("classifies fixed, new, and remaining groups by root cause key", () => {
    const before = scoped([g("k:fixed"), g("k:remaining", { affectedCount: 4 })]);
    const after = scoped([g("k:remaining", { affectedCount: 4 }), g("k:new")]);
    const out = compareScans(before, after);
    expect(out.fixed.map((x) => x.rootCauseKey)).toEqual(["k:fixed"]);
    expect(out.newIssues.map((x) => x.rootCauseKey)).toEqual(["k:new"]);
    expect(out.remaining.map((x) => x.rootCauseKey)).toEqual(["k:remaining"]);
    expect(out.totals.fixed).toBe(1);
    expect(out.totals.new).toBe(1);
    expect(out.totals.remaining).toBe(1);
  });

  it("marks remaining groups improved or regressed by instance delta", () => {
    const before = scoped([
      g("k:improved", { affectedCount: 10 }),
      g("k:regressed", { affectedCount: 2 }),
      g("k:same", { affectedCount: 3 }),
    ]);
    const after = scoped([
      g("k:improved", { affectedCount: 4 }),
      g("k:regressed", { affectedCount: 5 }),
      g("k:same", { affectedCount: 3 }),
    ]);
    const out = compareScans(before, after);
    const byKey = Object.fromEntries(out.remaining.map((x) => [x.rootCauseKey, x.status]));
    expect(byKey["k:improved"]).toBe("improved");
    expect(byKey["k:regressed"]).toBe("regressed");
    expect(byKey["k:same"]).toBe("remaining");
    // 6 instances removed from improved; 3 added to regressed.
    expect(out.totals.instancesResolved).toBe(6);
    expect(out.totals.instancesIntroduced).toBe(3);
  });

  it("buckets manual-review groups separately and never as fixed/new", () => {
    const before = scoped([g("r:gone", { severity: "review" })]);
    const after = scoped([
      g("r:added", { severity: "review" }),
      g("v:new", { severity: "critical" }),
    ]);
    const out = compareScans(before, after);
    expect(out.fixed).toHaveLength(0);
    expect(out.newIssues.map((x) => x.rootCauseKey)).toEqual(["v:new"]);
    expect(out.manualReview.map((x) => x.rootCauseKey).sort()).toEqual([
      "r:added",
      "r:gone",
    ]);
  });

  it("computes a score delta and direction when both summaries are present", () => {
    const out = compareScans(scoped([], score(60, "D")), scoped([], score(82, "B")));
    expect(out.score).toEqual({
      before: 60,
      after: 82,
      delta: 22,
      beforeGrade: "D",
      afterGrade: "B",
      direction: "up",
    });
  });

  it("returns a null score block when either summary is missing", () => {
    const out = compareScans(scoped([], score(60, "D")), scoped([]));
    expect(out.score).toBeNull();
  });

  it("orders results by priority then affected count", () => {
    const after = scoped([
      g("k:low", { priority: 60, affectedCount: 1 }),
      g("k:high", { priority: 10, affectedCount: 1 }),
      g("k:mid", { priority: 30, affectedCount: 1 }),
    ]);
    const out = compareScans(scoped([]), after);
    expect(out.newIssues.map((x) => x.rootCauseKey)).toEqual([
      "k:high",
      "k:mid",
      "k:low",
    ]);
  });

  // --- F02: "did not observe" must never read as "fixed" ---

  it("does not call a recolored contrast failure fixed+new", () => {
    // Same element, foreground #aaaaaa -> #bbbbbb. Both fail on white, so the
    // defect is unchanged — but rootCauseKey embeds the color pair.
    const before = scoped([
      g("violation:wcag:color-contrast:#aaaaaa|#ffffff", {
        affectedCount: 3,
        elementKeys: ["violation:wcag:color-contrast:.btn"],
      }),
    ]);
    const after = scoped([
      g("violation:wcag:color-contrast:#bbbbbb|#ffffff", {
        affectedCount: 3,
        elementKeys: ["violation:wcag:color-contrast:.btn"],
      }),
    ]);

    const out = compareScans(before, after);

    expect(out.fixed).toHaveLength(0);
    expect(out.newIssues).toHaveLength(0);
    expect(out.remaining).toHaveLength(1);
    expect(out.remaining[0].status).toBe("remaining");
    expect(out.totals.instancesResolved).toBe(0);
  });

  it("still reports a genuinely resolved contrast failure as fixed", () => {
    const before = scoped([
      g("violation:wcag:color-contrast:#aaaaaa|#ffffff", {
        elementKeys: ["violation:wcag:color-contrast:.btn"],
      }),
    ]);
    const out = compareScans(before, scoped([]));

    expect(out.fixed.map((x) => x.rootCauseKey)).toEqual([
      "violation:wcag:color-contrast:#aaaaaa|#ffffff",
    ]);
  });

  it("downgrades a disappeared finding to not_observed when a page is missing", () => {
    const before = {
      groups: [g("k:gone")],
      scope: { ...SCOPE, urls: ["https://example.com/", "https://example.com/pricing"] },
    };
    const after = { groups: [], scope: SCOPE };

    const out = compareScans(before, after);

    expect(out.fixed).toHaveLength(0);
    expect(out.notObserved.map((x) => x.status)).toEqual(["not_observed"]);
    expect(out.coverage.missingFromAfter).toEqual(["https://example.com/pricing"]);
    expect(out.coverage.scopeEquivalent).toBe(false);
    expect(out.totals.instancesResolved).toBe(0);
  });

  it("downgrades to not_observed when the re-scan had a failed page", () => {
    const after = { groups: [], scope: { ...SCOPE, failedPageCount: 1 } };

    const out = compareScans(scoped([g("k:gone")]), after);

    expect(out.fixed).toHaveLength(0);
    expect(out.notObserved).toHaveLength(1);
    expect(out.coverage.afterFailedPageCount).toBe(1);
  });

  it("does not call a finding new when the re-scan added a URL", () => {
    const after = {
      groups: [g("k:appeared")],
      scope: { ...SCOPE, urls: ["https://example.com/", "https://example.com/new"] },
    };

    const out = compareScans(scoped([]), after);

    // It may simply be pre-existing on a page the before scan never visited.
    expect(out.newIssues).toHaveLength(0);
    expect(out.notObserved.map((x) => x.rootCauseKey)).toEqual(["k:appeared"]);
    expect(out.coverage.addedInAfter).toEqual(["https://example.com/new"]);
  });

  it("reports inconclusive across a fingerprint version boundary", () => {
    const before = {
      groups: [g("k:gone")],
      scope: { ...SCOPE, fingerprintVersion: FINGERPRINT_VERSION - 1 },
    };

    const out = compareScans(before, scoped([g("k:appeared")]));

    expect(out.fixed).toHaveLength(0);
    expect(out.newIssues).toHaveLength(0);
    expect(out.inconclusive.map((x) => x.rootCauseKey).sort()).toEqual([
      "k:appeared",
      "k:gone",
    ]);
    expect(out.coverage.identityComparable).toBe(false);
  });

  it("refuses to assert anything when scope is unknown", () => {
    // A caller that forgets to pass scope must not get a free "fixed".
    const out = compareScans({ groups: [g("k:gone")] }, { groups: [] });

    expect(out.fixed).toHaveLength(0);
    expect(out.inconclusive).toHaveLength(1);
    expect(out.coverage.identityComparable).toBe(false);
  });

  it("keeps matching exact keys even when element sets are absent", () => {
    // Legacy groups (fingerprint v1) have no elementKeys; exact-key matching
    // must still work so remaining findings are not double counted.
    const before = scoped([g("k:same", { affectedCount: 2, elementKeys: [] })]);
    const after = scoped([g("k:same", { affectedCount: 2, elementKeys: [] })]);

    const out = compareScans(before, after);

    expect(out.remaining).toHaveLength(1);
    expect(out.fixed).toHaveLength(0);
    expect(out.newIssues).toHaveLength(0);
  });
});


describe("comparison confidence regressions (B03)", () => {
  it("suppresses score and instance improvement when a URL disappears", () => {
    const out = compareScans(
      { ...scoped([g("same", { affectedCount: 10 })], score(40, "F")), scope: { ...SCOPE, urls: ["https://example.com/", "https://example.com/removed"] } },
      scoped([g("same", { affectedCount: 1 })], score(95, "A"))
    );
    expect(out.score).toBeNull();
    expect(out.totals.instancesResolved).toBe(0);
    expect(out.remaining.some((g) => g.status === "improved")).toBe(false);
  });
  it("never calls findings new when the previous scan failed pages", () => {
    const out = compareScans({ ...scoped([]), scope: { ...SCOPE, failedPageCount: 1 } }, scoped([g("new")]));
    expect(out.newIssues).toHaveLength(0);
  });
});
