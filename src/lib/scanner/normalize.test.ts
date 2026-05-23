import { describe, it, expect } from "vitest";
import { normalizeAxeResults, normalizeAxeViolation } from "./normalize";
import type { Result as AxeResult } from "axe-core";

function fakeResult(overrides: Partial<AxeResult> = {}): AxeResult {
  return {
    id: "color-contrast",
    impact: "serious",
    tags: ["wcag2aa", "wcag143", "cat.color"],
    description: "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
    help: "Elements must have sufficient color contrast",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.7/color-contrast",
    nodes: [
      {
        target: [".product-hero .price"],
        html: '<span class="price">$48</span>',
        impact: "serious",
        any: [],
        all: [],
        none: [],
        failureSummary: "Fix any of the following:\n  Element has insufficient color contrast of 3.8",
      } as never,
    ],
    ...overrides,
  } as AxeResult;
}

describe("normalizeAxeViolation", () => {
  it("maps axe severity correctly", () => {
    const issues = normalizeAxeViolation(fakeResult());
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("moderate"); // serious impact stays serious; severity is workflow grouping
    expect(issues[0].impact).toBe("serious");
    expect(issues[0].ruleId).toBe("color-contrast");
  });

  it("marks color-contrast as needs-human-review", () => {
    const issues = normalizeAxeViolation(fakeResult());
    expect(issues[0].humanReviewRequired).toBe(true);
  });

  it("marks incomplete results as review-severity and human-review-required", () => {
    const issues = normalizeAxeViolation(fakeResult({ id: "frame-tested" }), { incomplete: true });
    expect(issues[0].severity).toBe("review");
    expect(issues[0].humanReviewRequired).toBe(true);
  });

  it("preserves WCAG tags", () => {
    const issues = normalizeAxeViolation(fakeResult());
    expect(issues[0].wcagTags).toContain("wcag2aa");
    expect(issues[0].wcagTags).toContain("wcag143");
  });

  it("creates one Issue per node", () => {
    const result = fakeResult({
      nodes: [
        { target: ["a"], html: "<a/>", impact: "minor", any: [], all: [], none: [] } as never,
        { target: ["b"], html: "<b/>", impact: "minor", any: [], all: [], none: [] } as never,
        { target: ["c"], html: "<c/>", impact: "minor", any: [], all: [], none: [] } as never,
      ],
    });
    const issues = normalizeAxeViolation(result);
    expect(issues).toHaveLength(3);
  });

  it("flattens array targets with ' >> ' separator", () => {
    const result = fakeResult({
      nodes: [
        {
          target: [["iframe", ".inner"]],
          html: "<x/>",
          impact: "minor",
          any: [],
          all: [],
          none: [],
        } as never,
      ],
    });
    const issues = normalizeAxeViolation(result);
    expect(issues[0].target[0]).toBe("iframe >> .inner");
  });

  it("truncates oversized HTML snippets to 4000 chars", () => {
    const long = "a".repeat(10_000);
    const result = fakeResult({
      nodes: [{ target: ["x"], html: long, impact: "minor", any: [], all: [], none: [] } as never],
    });
    const issues = normalizeAxeViolation(result);
    expect(issues[0].htmlSnippet?.length).toBeLessThanOrEqual(4000);
  });
});

describe("normalizeAxeResults", () => {
  it("combines violations and incomplete", () => {
    const out = normalizeAxeResults({
      violations: [fakeResult({ id: "button-name", impact: "critical" })],
      incomplete: [fakeResult({ id: "color-contrast", impact: "moderate" })],
    });
    expect(out).toHaveLength(2);
    expect(out.find((i) => i.ruleId === "button-name")?.severity).toBe("moderate");
    expect(out.find((i) => i.ruleId === "color-contrast")?.severity).toBe("review");
  });
});
