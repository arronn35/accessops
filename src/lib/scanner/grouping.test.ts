import { describe, it, expect } from "vitest";
import {
  groupIssues,
  rootCauseKeyFor,
  normalizeSelector,
  contrastColorPair,
  priorityFor,
  type GroupableIssue,
} from "./grouping";

function mk(partial: Partial<GroupableIssue> & { id: string }): GroupableIssue {
  return {
    ruleId: "label",
    severity: "moderate",
    wcagTags: ["wcag2a", "wcag412"],
    help: "Form elements must have labels",
    description: "Ensures every form element has a label",
    helpUrl: "https://example.com/label",
    target: ["#email"],
    failureSummary: null,
    humanReviewRequired: false,
    ...partial,
  };
}

describe("normalizeSelector", () => {
  it("strips positional pseudo-classes", () => {
    expect(normalizeSelector(["ul > li:nth-child(3) > a"])).toBe("ul > li > a");
    expect(normalizeSelector(["div:nth-of-type(2)"])).toBe("div");
  });
  it("collapses axe's >> frame joiner and extra whitespace", () => {
    expect(normalizeSelector(["iframe >>  button"])).toBe("iframe button");
  });
  it("returns empty string for no target", () => {
    expect(normalizeSelector(null)).toBe("");
  });
});

describe("contrastColorPair", () => {
  it("parses foreground/background hex colors", () => {
    const summary =
      "Element has insufficient color contrast of 2.5 (foreground color: #777777, background color: #ffffff, font size: 12pt)";
    expect(contrastColorPair(summary)).toBe("#777777|#ffffff");
  });
  it("is case-insensitive and lowercases", () => {
    expect(
      contrastColorPair("foreground color: #ABCDEF, background color: #123456")
    ).toBe("#abcdef|#123456");
  });
  it("returns null when colors are absent", () => {
    expect(contrastColorPair("no colors here")).toBeNull();
    expect(contrastColorPair(null)).toBeNull();
  });
});

describe("groupIssues", () => {
  it("collapses every unlabeled input on the same selector into one group", () => {
    const issues = [
      mk({ id: "1", target: ["form > input:nth-child(1)"] }),
      mk({ id: "2", target: ["form > input:nth-child(2)"] }),
      mk({ id: "3", target: ["form > input:nth-child(5)"] }),
    ];
    const { groups, keyByIssueId } = groupIssues(issues);
    expect(groups).toHaveLength(1);
    expect(groups[0].affectedCount).toBe(3);
    expect(groups[0].issueIds.sort()).toEqual(["1", "2", "3"]);
    // All three map to the same root-cause key.
    expect(new Set(keyByIssueId.values()).size).toBe(1);
  });

  it("collapses color-contrast findings by shared color pair, not selector", () => {
    const issues = [
      mk({
        id: "a",
        ruleId: "color-contrast",
        severity: "moderate",
        target: [".btn-primary"],
        failureSummary: "foreground color: #fff, background color: #6c8",
      }),
      mk({
        id: "b",
        ruleId: "color-contrast",
        severity: "moderate",
        target: [".cta"],
        failureSummary: "foreground color: #fff, background color: #6c8",
      }),
      mk({
        id: "c",
        ruleId: "color-contrast",
        severity: "moderate",
        target: [".footer-link"],
        failureSummary: "foreground color: #aaa, background color: #fff",
      }),
    ];
    const { groups } = groupIssues(issues);
    // Two distinct color pairs => two groups.
    expect(groups).toHaveLength(2);
    const counts = groups.map((g) => g.affectedCount).sort();
    expect(counts).toEqual([1, 2]);
  });

  it("keeps manual-review findings separate from confirmed violations", () => {
    const issues = [
      mk({ id: "v", ruleId: "image-alt", severity: "critical", target: ["img"] }),
      mk({
        id: "r",
        ruleId: "image-alt",
        severity: "review",
        humanReviewRequired: true,
        target: ["img"],
      }),
    ];
    const { groups } = groupIssues(issues);
    expect(groups).toHaveLength(2);
  });

  it("keeps best-practice findings separate from WCAG findings", () => {
    const issues = [
      mk({ id: "w", ruleId: "region", wcagTags: ["wcag2a"], target: ["main"] }),
      mk({ id: "bp", ruleId: "region", wcagTags: ["best-practice"], target: ["main"] }),
    ];
    const { groups } = groupIssues(issues);
    expect(groups).toHaveLength(2);
  });

  it("orders groups by priority then affected count", () => {
    const issues = [
      mk({ id: "minor1", ruleId: "landmark-unique", severity: "minor", target: ["nav"] }),
      mk({ id: "crit1", ruleId: "button-name", severity: "critical", target: ["button"] }),
      mk({ id: "rev1", ruleId: "color-contrast", severity: "review", humanReviewRequired: true, target: ["p"], failureSummary: "x" }),
    ];
    const { groups } = groupIssues(issues);
    // critical first, manual-review last.
    expect(groups[0].ruleId).toBe("button-name");
    expect(groups[groups.length - 1].severity).toBe("review");
  });

  it("sets group severity to the worst member", () => {
    const issues = [
      mk({ id: "1", ruleId: "link-name", severity: "minor", target: ["a"] }),
      mk({ id: "2", ruleId: "link-name", severity: "critical", target: ["a"] }),
    ];
    const { groups } = groupIssues(issues);
    expect(groups).toHaveLength(1);
    expect(groups[0].severity).toBe("critical");
  });
});

describe("priorityFor", () => {
  it("ranks critical above forms above contrast above semantic above review", () => {
    const critical = priorityFor({ ruleId: "anything", severity: "critical", isReview: false });
    const forms = priorityFor({ ruleId: "label", severity: "moderate", isReview: false });
    const contrast = priorityFor({ ruleId: "color-contrast", severity: "moderate", isReview: false });
    const semantic = priorityFor({ ruleId: "heading-order", severity: "moderate", isReview: false });
    const review = priorityFor({ ruleId: "color-contrast", severity: "review", isReview: true });
    expect(critical).toBeLessThan(forms);
    expect(forms).toBeLessThan(contrast);
    expect(contrast).toBeLessThan(semantic);
    expect(semantic).toBeLessThan(review);
  });
});

describe("rootCauseKeyFor", () => {
  it("encodes category, standard, rule and discriminator", () => {
    const key = rootCauseKeyFor(mk({ id: "1", ruleId: "label", target: ["#a"] }));
    expect(key).toBe("violation:wcag:label:#a");
  });
});
