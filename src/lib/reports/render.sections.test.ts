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
    expect(html).toContain("Human review checklist");
  });

  it("honors an explicit section selection", () => {
    const html = renderHtml(input({ sections: ["exec", "roadmap"] }));
    expect(html).toContain("Executive summary");
    expect(html).toContain("Remediation roadmap");
    expect(html).not.toContain("Findings by severity");
    expect(html).not.toContain("WCAG mapping");
    expect(html).not.toContain("Human review checklist");
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
