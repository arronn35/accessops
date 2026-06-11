import { describe, it, expect } from "vitest";
import {
  compareScans,
  type CompareGroupInput,
  type CompareScoreInput,
} from "./compare";

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
  };
}

const score = (overall: number, grade: string): CompareScoreInput => ({
  overallScore: overall,
  grade,
  riskLevel: "medium",
  manualReviewCount: 0,
});

describe("compareScans", () => {
  it("classifies fixed, new, and remaining groups by root cause key", () => {
    const before = {
      groups: [g("k:fixed"), g("k:remaining", { affectedCount: 4 })],
    };
    const after = {
      groups: [g("k:remaining", { affectedCount: 4 }), g("k:new")],
    };
    const out = compareScans(before, after);
    expect(out.fixed.map((x) => x.rootCauseKey)).toEqual(["k:fixed"]);
    expect(out.newIssues.map((x) => x.rootCauseKey)).toEqual(["k:new"]);
    expect(out.remaining.map((x) => x.rootCauseKey)).toEqual(["k:remaining"]);
    expect(out.totals.fixed).toBe(1);
    expect(out.totals.new).toBe(1);
    expect(out.totals.remaining).toBe(1);
  });

  it("marks remaining groups improved or regressed by instance delta", () => {
    const before = {
      groups: [
        g("k:improved", { affectedCount: 10 }),
        g("k:regressed", { affectedCount: 2 }),
        g("k:same", { affectedCount: 3 }),
      ],
    };
    const after = {
      groups: [
        g("k:improved", { affectedCount: 4 }),
        g("k:regressed", { affectedCount: 5 }),
        g("k:same", { affectedCount: 3 }),
      ],
    };
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
    const before = { groups: [g("r:gone", { severity: "review" })] };
    const after = {
      groups: [
        g("r:added", { severity: "review" }),
        g("v:new", { severity: "critical" }),
      ],
    };
    const out = compareScans(before, after);
    expect(out.fixed).toHaveLength(0);
    expect(out.newIssues.map((x) => x.rootCauseKey)).toEqual(["v:new"]);
    expect(out.manualReview.map((x) => x.rootCauseKey).sort()).toEqual([
      "r:added",
      "r:gone",
    ]);
  });

  it("computes a score delta and direction when both summaries are present", () => {
    const out = compareScans(
      { groups: [], score: score(60, "D") },
      { groups: [], score: score(82, "B") }
    );
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
    const out = compareScans(
      { groups: [], score: score(60, "D") },
      { groups: [] }
    );
    expect(out.score).toBeNull();
  });

  it("orders results by priority then affected count", () => {
    const after = {
      groups: [
        g("k:low", { priority: 60, affectedCount: 1 }),
        g("k:high", { priority: 10, affectedCount: 1 }),
        g("k:mid", { priority: 30, affectedCount: 1 }),
      ],
    };
    const out = compareScans({ groups: [] }, after);
    expect(out.newIssues.map((x) => x.rootCauseKey)).toEqual([
      "k:high",
      "k:mid",
      "k:low",
    ]);
  });
});
