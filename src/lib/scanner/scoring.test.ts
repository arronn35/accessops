import { describe, expect, it } from "vitest";
import { calculateScanScore } from "./scoring";
import type { Impact, NormalizedIssue, NormalizedPage } from "./types";

function issue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  const impact = overrides.impact ?? "moderate";
  return {
    ruleId: overrides.ruleId ?? "color-contrast",
    impact,
    severity: overrides.severity ?? (impact === "critical" ? "critical" : "moderate"),
    wcagTags: overrides.wcagTags ?? ["wcag2aa", "wcag143", "cat.color"],
    description: "description",
    help: "help",
    target: overrides.target ?? [".target"],
    htmlSnippet: overrides.htmlSnippet ?? "<div class='target'>Text</div>",
    failureSummary: "failure",
    humanReviewRequired: overrides.humanReviewRequired ?? false,
    contexts: overrides.contexts,
  };
}

function page(issues: NormalizedIssue[] = [], url = "https://example.com/"): NormalizedPage {
  return {
    url,
    title: "Page",
    statusCode: 200,
    scannedAt: new Date("2026-05-23T00:00:00Z"),
    issues,
  };
}

describe("calculateScanScore", () => {
  it("returns a perfect score for empty and all-passed scan results", () => {
    expect(calculateScanScore([]).overallScore).toBe(100);
    expect(calculateScanScore([page([])]).overallScore).toBe(100);
    expect(calculateScanScore([page([])]).grade).toBe("A");
  });

  it("separates WCAG and best-practice issues", () => {
    const summary = calculateScanScore([
      page([
        issue({ ruleId: "color-contrast", wcagTags: ["wcag2aa", "wcag143"] }),
        issue({
          ruleId: "skip-link",
          impact: "moderate",
          severity: "review",
          wcagTags: ["best-practice"],
          humanReviewRequired: true,
        }),
      ]),
    ]);

    expect(summary.wcagIssueCount).toBe(1);
    expect(summary.bestPracticeIssueCount).toBe(1);
    expect(summary.categoryScores.bestPractices).toBeLessThan(100);
    expect(summary.overallScore).toBe(97);
  });

  it("uses critical, serious, moderate, minor, and review weights", () => {
    const impacts: Impact[] = ["critical", "serious", "moderate", "minor"];
    const summary = calculateScanScore([
      page([
        ...impacts.map((impactValue) =>
          issue({
            ruleId: `rule-${impactValue}`,
            impact: impactValue,
            severity: impactValue === "critical" ? "critical" : "moderate",
            target: [`.${impactValue}`],
            htmlSnippet: `<div class="${impactValue}"></div>`,
          })
        ),
        issue({
          ruleId: "manual-review",
          impact: "moderate",
          severity: "review",
          target: [".review"],
          htmlSnippet: "<div class='review'></div>",
          humanReviewRequired: true,
        }),
      ]),
    ]);

    expect(summary.issueCounts).toEqual({
      critical: 1,
      serious: 1,
      moderate: 1,
      minor: 1,
      review: 1,
    });
    expect(summary.overallScore).toBe(78);
  });

  it("deduplicates repeated issues and caps repeated component damage", () => {
    const repeated = Array.from({ length: 10 }, () =>
      issue({
        ruleId: "button-name",
        impact: "critical",
        severity: "critical",
        target: ["button.primary"],
        htmlSnippet: "<button class='primary'></button>",
      })
    );

    const summary = calculateScanScore([page(repeated)]);
    expect(summary.wcagIssueCount).toBe(1);
    expect(summary.overallScore).toBe(70);
  });

  it("preserves merged mobile and desktop contexts", () => {
    const summary = calculateScanScore([
      page([
        issue({
          contexts: [
            { viewport: "desktop", state: "initial" },
            { viewport: "mobile", state: "menu-open" },
          ],
        }),
      ]),
    ]);

    expect(summary.pageScores[0].issueCounts.moderate).toBe(1);
    expect(summary.overallScore).toBe(97);
  });

  it("counts incomplete/review results as manual review", () => {
    const summary = calculateScanScore([
      page([
        issue({
          ruleId: "frame-tested",
          severity: "review",
          humanReviewRequired: true,
          wcagTags: ["wcag2a"],
        }),
      ]),
    ]);

    expect(summary.manualReviewCount).toBe(1);
    expect(summary.issueCounts.review).toBe(1);
    expect(summary.overallScore).toBe(98);
  });
});
