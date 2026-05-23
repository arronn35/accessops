import { describe, it, expect } from "vitest";
import { renderHtml, renderCsv, type ReportInput } from "./render";

function fakeInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    title: "Test report",
    workspaceName: "Acme",
    scanId: "scan-1",
    baseUrl: "https://example.org/",
    pagesScanned: 2,
    scanDate: new Date("2026-05-20T10:00:00Z"),
    counts: { critical: 1, moderate: 0, minor: 0, passed: 0, review: 0 },
    issues: [
      {
        id: "i1",
        ruleId: "button-name",
        severity: "critical",
        impact: "critical",
        description: "Buttons must have discernible text",
        help: "Buttons must have an accessible name",
        helpUrl: "https://example.org/help",
        wcagTags: ["wcag2a", "wcag412"],
        pageUrl: "https://example.org/x",
        pageTitle: "X",
      },
    ],
    ...overrides,
  };
}

describe("renderHtml", () => {
  it("includes the non-legal disclaimer", () => {
    const html = renderHtml(fakeInput());
    expect(html).toMatch(/not a legal certification/i);
  });

  it("escapes HTML in user-provided strings", () => {
    const html = renderHtml(
      fakeInput({
        title: "<script>alert(1)</script>",
        baseUrl: "<bad>",
      })
    );
    expect(html).not.toMatch(/<script>alert/);
    expect(html).toMatch(/&lt;script&gt;/);
  });

  it("renders severity stat cards", () => {
    const html = renderHtml(fakeInput());
    expect(html).toMatch(/Critical/);
    expect(html).toMatch(/Moderate/);
  });

  it("never includes forbidden compliance claims", () => {
    const html = renderHtml(fakeInput());
    expect(html).not.toMatch(/fully compliant/i);
    expect(html).not.toMatch(/100% compliant/i);
    expect(html).not.toMatch(/legally compliant/i);
  });
});

describe("renderCsv", () => {
  it("includes header row", () => {
    const csv = renderCsv(fakeInput());
    expect(csv.split("\n")[0]).toMatch(/issue_id.*rule_id.*severity/);
  });

  it("appends a disclaimer row", () => {
    const csv = renderCsv(fakeInput());
    expect(csv).toMatch(/DISCLAIMER/);
    expect(csv).toMatch(/not a legal certification/i);
  });

  it("escapes embedded quotes correctly", () => {
    const csv = renderCsv(
      fakeInput({
        issues: [
          {
            ...fakeInput().issues[0],
            description: 'Has "quotes" inside',
          },
        ],
      })
    );
    expect(csv).toMatch(/""quotes""/);
  });
});
