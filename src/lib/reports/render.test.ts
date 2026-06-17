import { describe, it, expect } from "vitest";
import { renderHtml, renderCsv, renderJson, type ReportInput } from "./render";

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

  it("includes per-instance group columns tying issues to root causes", () => {
    const csv = renderCsv(
      fakeInput({
        issues: [{ ...fakeInput().issues[0], groupId: "g1" }],
        groups: [
          {
            id: "g1",
            ruleId: "button-name",
            title: "Buttons missing names",
            severity: "critical",
            affectedCount: 3,
            primaryWcagTag: "wcag412",
            recommendedFix: "Add accessible names",
            priority: 10,
          },
        ],
      })
    );
    expect(csv.split("\n")[0]).toMatch(/group_id.*group_title.*group_affected_count/);
    expect(csv).toMatch(/Buttons missing names/);
  });
});

describe("renderJson", () => {
  it("emits schema version, grouped + normalized issues, and the disclaimer", () => {
    const json = JSON.parse(
      renderJson(
        fakeInput({
          issues: [{ ...fakeInput().issues[0], groupId: "g1" }],
          groups: [
            {
              id: "g1",
              ruleId: "button-name",
              title: "Buttons missing names",
              severity: "critical",
              affectedCount: 1,
              primaryWcagTag: "wcag412",
              recommendedFix: "Add names",
              priority: 10,
            },
          ],
        })
      )
    );
    expect(json.schemaVersion).toBe("percevia-report-v1");
    expect(json.scan.baseUrl).toBe("https://example.org/");
    expect(json.groups[0].instanceIds).toEqual(["i1"]);
    expect(json.issues[0].screenshot.captured).toBe(false);
    expect(json.disclaimer).toMatch(/not a legal certification/i);
  });
});

describe("agency branding", () => {
  it("attributes the workspace alone when agencyBranding is true", () => {
    const html = renderHtml(fakeInput({ agencyBranding: true }));
    expect(html).toMatch(/Prepared by Acme\./);
    expect(html).not.toMatch(/Prepared with Percevia AI/);
  });

  it("carries Percevia attribution by default", () => {
    const html = renderHtml(fakeInput());
    expect(html).toMatch(/Prepared with Percevia AI by Acme\./);
  });
});
