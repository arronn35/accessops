import { describe, expect, it } from "vitest";
import { renderHtml, type ReportInput } from "./render";

function input(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    title: "Example report",
    workspaceName: "Acme",
    scanId: "scan-1",
    baseUrl: "https://example.com",
    pagesScanned: 2,
    scanDate: new Date("2026-06-10T00:00:00Z"),
    counts: { critical: 1, moderate: 1, minor: 0, passed: 0, review: 0 },
    issues: [
      {
        id: "i1",
        ruleId: "color-contrast",
        severity: "critical",
        impact: "critical",
        description: "Insufficient contrast",
        help: "Elements must meet contrast minimums",
        wcagTags: ["wcag2aa", "wcag143"],
        pageUrl: "https://example.com/",
        pageTitle: "Home",
        evidence: {
          dataUri: "data:image/png;base64,QUJD",
          selector: ".cta",
          redactionApplied: true,
        },
      },
      {
        id: "i2",
        ruleId: "label",
        severity: "moderate",
        impact: "serious",
        description: "Missing label",
        help: "Form elements need labels",
        wcagTags: ["wcag2a", "wcag412"],
        pageUrl: "https://example.com/contact",
        pageTitle: "Contact",
      },
    ],
    ...overrides,
  };
}

describe("renderHtml section selection", () => {
  it("renders every section by default", () => {
    const html = renderHtml(input());
    expect(html).toContain("Executive summary");
    expect(html).toContain("Findings by severity");
    expect(html).toContain("Findings by page");
    expect(html).toContain("WCAG mapping");
    expect(html).toContain("Remediation roadmap");
    expect(html).toContain("Human review");
  });

  it("honors an explicit section selection", () => {
    const html = renderHtml(input({ sections: ["exec", "roadmap"] }));
    expect(html).toContain("Executive summary");
    expect(html).toContain("Remediation roadmap");
    expect(html).not.toContain("Findings by severity");
    expect(html).not.toContain("WCAG mapping");
    expect(html).not.toContain("Human review");
  });

  it("executive reports collapse to the summary view", () => {
    const html = renderHtml(input({ reportType: "executive" }));
    expect(html).toContain("Executive summary");
    expect(html).not.toContain("Findings by severity");
    expect(html).toContain("Remediation roadmap");
  });

  it("always keeps the scope notice and disclaimer", () => {
    const html = renderHtml(input({ sections: ["exec"] }));
    expect(html).toContain("Scan scope");
    expect(html).toContain("not a legal");
  });

  it("numbers visible sections sequentially", () => {
    const html = renderHtml(input({ sections: ["exec", "roadmap"] }));
    expect(html).toContain("1. Executive summary");
    expect(html).toContain("2. Scan scope");
    expect(html).toContain("3. Remediation roadmap");
  });

  it("embeds visual evidence images", () => {
    const html = renderHtml(input());
    expect(html).toContain("data:image/png;base64,QUJD");
    expect(html).toContain("Sensitive regions redacted");
  });
});

describe("roadmap and checklist are derived from the scan", () => {
  it("sequences the roadmap from the scan's own findings", () => {
    const html = renderHtml(input({ sections: ["roadmap"] }));

    // Severity bands, ordered most-blocking first.
    expect(html).toContain("Now — blocking");
    expect(html).toContain("Next — degrading");
    // The findings themselves, not a fixed week-by-week plan.
    expect(html).toContain("color-contrast");
    expect(html).toContain("label");
    expect(html).not.toContain("Week 1");
    expect(html).not.toContain("Week 2");
    expect(html).not.toContain("Week 3");
  });

  it("omits severity bands the scan did not produce", () => {
    const html = renderHtml(
      input({
        sections: ["roadmap"],
        counts: { critical: 1, moderate: 0, minor: 0, passed: 0, review: 0 },
        issues: [
          {
            id: "i1",
            ruleId: "color-contrast",
            severity: "critical",
            impact: "critical",
            description: "Insufficient contrast",
            help: "Elements must meet contrast minimums",
            wcagTags: ["wcag2aa"],
            pageUrl: "https://example.com/",
            pageTitle: "Home",
          },
        ],
      })
    );

    expect(html).toContain("Now — blocking");
    expect(html).not.toContain("Next — degrading");
    expect(html).not.toContain("Then — polish");
  });

  it("prefers grouped root causes over raw rule counts", () => {
    const html = renderHtml(
      input({
        sections: ["roadmap"],
        groups: [
          {
            id: "g1",
            ruleId: "color-contrast",
            title: "Raise contrast on the primary call to action",
            severity: "critical",
            affectedCount: 7,
            primaryWcagTag: "wcag143",
            recommendedFix: "Darken the button background token.",
            priority: 1,
          },
        ],
      })
    );

    expect(html).toContain("Raise contrast on the primary call to action");
    expect(html).toContain("7 instances");
    expect(html).toContain("Darken the button background token.");
  });

  it("points the manual checklist at the pages that were actually scanned", () => {
    const html = renderHtml(input({ sections: ["checklist"] }));

    expect(html).toContain("https://example.com/contact");
    // The old checklist named e-commerce pages on every report.
    expect(html).not.toContain("product detail");
    expect(html).not.toContain("home, product detail, checkout");
  });

  it("flags review-only findings and unscannable pages in the checklist", () => {
    const html = renderHtml(
      input({
        sections: ["checklist"],
        counts: { critical: 0, moderate: 0, minor: 0, passed: 0, review: 2 },
        pagesFailedToScan: 1,
        failedPageUrls: ["https://example.com/broken"],
      })
    );

    expect(html).toContain("2 findings marked");
    expect(html).toContain("1 page could not be analyzed");
  });
});
