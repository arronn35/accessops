import { describe, expect, it } from "vitest";
import {
  FRAMEWORKS,
  en301549Clause,
  frameworkScope,
  frameworksForCriterion,
  mapIssueTags,
  summarizeCompliance,
} from "./frameworks";
import { WCAG_CRITERIA, criteriaFromAxeTags, wcagCriterion } from "./wcag-criteria";

describe("criteriaFromAxeTags", () => {
  it("resolves three-digit tags", () => {
    expect(criteriaFromAxeTags(["wcag111"]).map((c) => c.num)).toEqual(["1.1.1"]);
    expect(criteriaFromAxeTags(["wcag412"]).map((c) => c.num)).toEqual(["4.1.2"]);
  });

  it("resolves four-digit tags to the criterion that exists", () => {
    // "wcag1410" is 1.4.10 (Reflow), not 14.1.0.
    expect(criteriaFromAxeTags(["wcag1410"]).map((c) => c.num)).toEqual(["1.4.10"]);
    expect(criteriaFromAxeTags(["wcag2411"]).map((c) => c.num)).toEqual(["2.4.11"]);
  });

  it("ignores non-criterion tags", () => {
    expect(criteriaFromAxeTags(["wcag2aa", "best-practice", "cat.color"])).toEqual([]);
  });

  it("deduplicates and orders criteria", () => {
    expect(
      criteriaFromAxeTags(["wcag143", "wcag111", "wcag143"]).map((c) => c.num)
    ).toEqual(["1.1.1", "1.4.3"]);
  });
});

describe("frameworksForCriterion", () => {
  it("puts a WCAG 2.0 criterion under every framework including Section 508", () => {
    const ids = frameworksForCriterion(wcagCriterion("1.1.1")!);
    expect(ids).toContain("section508");
    expect(ids).toContain("en301549");
    expect(ids).toContain("eaa");
    expect(ids).toContain("wcag21aa");
  });

  it("excludes Section 508 for criteria added in WCAG 2.1", () => {
    // Section 508 incorporates WCAG 2.0 only; Reflow arrived in 2.1.
    const ids = frameworksForCriterion(wcagCriterion("1.4.10")!);
    expect(ids).not.toContain("section508");
    expect(ids).toContain("en301549");
  });

  it("excludes EN 301 549 v3.2.1 and the EAA for WCAG 2.2-only criteria", () => {
    const ids = frameworksForCriterion(wcagCriterion("2.5.8")!);
    expect(ids).toEqual(["wcag22aa"]);
    expect(en301549Clause(wcagCriterion("2.5.8")!)).toBeNull();
  });

  it("drops 4.1.1 Parsing from a WCAG 2.2 assessment", () => {
    const ids = frameworksForCriterion(wcagCriterion("4.1.1")!);
    expect(ids).not.toContain("wcag22aa");
    expect(ids).toContain("section508");
  });
});

describe("en301549Clause", () => {
  it("numbers web criteria as 9.x", () => {
    expect(en301549Clause(wcagCriterion("1.4.3")!)).toBe("9.1.4.3");
    expect(en301549Clause(wcagCriterion("2.4.7")!)).toBe("9.2.4.7");
  });
});

describe("mapIssueTags", () => {
  it("maps a contrast finding to its criterion and frameworks", () => {
    const mapping = mapIssueTags(["wcag2aa", "wcag143", "cat.color"]);
    expect(mapping.criteria.map((c) => c.criterion.num)).toEqual(["1.4.3"]);
    expect(mapping.criteria[0].en301549Clause).toBe("9.1.4.3");
    expect(mapping.bestPracticeOnly).toBe(false);
  });

  it("flags best-practice-only findings instead of inventing a criterion", () => {
    const mapping = mapIssueTags(["best-practice", "cat.semantics"]);
    expect(mapping.criteria).toEqual([]);
    expect(mapping.frameworks).toEqual([]);
    expect(mapping.bestPracticeOnly).toBe(true);
  });
});

describe("summarizeCompliance", () => {
  const issues = [
    { wcagTags: ["wcag2a", "wcag111"] }, // image-alt → 1.1.1
    { wcagTags: ["wcag2aa", "wcag143"] }, // contrast → 1.4.3
    { wcagTags: ["wcag21aa", "wcag1410"] }, // reflow → 1.4.10 (2.1)
    { wcagTags: ["best-practice"] },
  ];

  it("counts findings per framework", () => {
    const summary = summarizeCompliance(issues);
    const byId = Object.fromEntries(
      summary.coverage.map((entry) => [entry.framework.id, entry])
    );
    expect(byId.en301549.findings).toBe(3);
    // Section 508 references WCAG 2.0 only, so Reflow is out of its scope.
    expect(byId.section508.findings).toBe(2);
    expect(byId.section508.affectedCriteria).toEqual(["1.1.1", "1.4.3"]);
  });

  it("keeps best-practice findings out of the framework counts", () => {
    const summary = summarizeCompliance(issues);
    expect(summary.bestPracticeFindings).toBe(1);
    expect(summary.totalFindings).toBe(4);
    expect(summary.affectedCriteria.map((c) => c.criterion.num)).toEqual([
      "1.1.1",
      "1.4.3",
      "1.4.10",
    ]);
  });

  it("reports nothing affected for a clean scan", () => {
    const summary = summarizeCompliance([]);
    expect(summary.affectedCriteria).toEqual([]);
    expect(summary.coverage.every((entry) => entry.findings === 0)).toBe(true);
  });
});

describe("frameworkScope", () => {
  it("states how much of a framework still needs a human", () => {
    const scope = frameworkScope("en301549");
    expect(scope.total).toBeGreaterThan(40);
    expect(scope.manualOnly).toBeGreaterThan(0);
    expect(scope.manualOnly).toBeLessThan(scope.total);
  });

  it("covers every framework we advertise", () => {
    for (const id of Object.keys(FRAMEWORKS) as Array<keyof typeof FRAMEWORKS>) {
      expect(frameworkScope(id).total).toBeGreaterThan(0);
    }
  });
});

describe("criteria table", () => {
  it("has unique, well-formed criterion numbers", () => {
    const nums = WCAG_CRITERIA.map((c) => c.num);
    expect(new Set(nums).size).toBe(nums.length);
    for (const num of nums) expect(num).toMatch(/^\d\.\d\.\d{1,2}$/);
  });

  it("contains only A and AA", () => {
    expect(WCAG_CRITERIA.every((c) => c.level === "A" || c.level === "AA")).toBe(true);
  });
});
