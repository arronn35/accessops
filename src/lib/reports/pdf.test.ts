import { describe, it, expect } from "vitest";
import { renderPdf, pdfFilename } from "./pdf";
import type { ReportInput, ReportInputIssue } from "./render";

function fakeIssue(overrides: Partial<ReportInputIssue> = {}): ReportInputIssue {
  return {
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
    ...overrides,
  };
}

function fakeInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    title: "Test report",
    workspaceName: "Acme",
    scanId: "scan-1",
    baseUrl: "https://example.org/",
    pagesScanned: 2,
    scanDate: new Date("2026-05-20T10:00:00Z"),
    counts: { critical: 1, moderate: 0, minor: 0, passed: 0, review: 0 },
    issues: [fakeIssue()],
    ...overrides,
  };
}

function header(bytes: Uint8Array): string {
  return Buffer.from(bytes.slice(0, 8)).toString("latin1");
}

describe("renderPdf", () => {
  it("produces a valid PDF byte stream", async () => {
    const bytes = await renderPdf(fakeInput());
    expect(header(bytes)).toMatch(/^%PDF-/);
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it("renders a report with no findings", async () => {
    const bytes = await renderPdf(
      fakeInput({
        issues: [],
        counts: { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 },
      })
    );
    expect(header(bytes)).toMatch(/^%PDF-/);
  });

  it("paginates a large number of findings without throwing", async () => {
    const issues = Array.from({ length: 120 }, (_, i) =>
      fakeIssue({
        id: `i${i}`,
        ruleId: `rule-${i}`,
        severity: ["critical", "moderate", "minor", "review"][i % 4],
        pageUrl: `https://example.org/a/very/long/path/segment/number/${i}?query=value&other=value`,
      })
    );
    const bytes = await renderPdf(
      fakeInput({
        issues,
        counts: { critical: 30, moderate: 30, minor: 30, passed: 0, review: 30 },
      })
    );
    expect(header(bytes)).toMatch(/^%PDF-/);
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });

  it("does not throw on non-Latin-1 text (Turkish, emoji, CJK)", async () => {
    const bytes = await renderPdf(
      fakeInput({
        title: "Erişilebilirlik değerlendirmesi 🚀 测试",
        workspaceName: "Şirket Ağı",
        issues: [
          fakeIssue({
            help: "Düğmelerin erişilebilir bir adı olmalı",
            description: "İçerik ekran okuyucular tarafından okunamıyor 🔍",
          }),
        ],
      })
    );
    expect(header(bytes)).toMatch(/^%PDF-/);
  });

  it("hard-wraps single tokens longer than the column", async () => {
    const bytes = await renderPdf(
      fakeInput({
        issues: [
          fakeIssue({
            ruleId: "a".repeat(400),
            pageUrl: `https://example.org/${"b".repeat(400)}`,
          }),
        ],
      })
    );
    expect(header(bytes)).toMatch(/^%PDF-/);
  });
});

describe("pdfFilename", () => {
  it("builds a download filename from the report id", () => {
    expect(pdfFilename("abc-123")).toBe("accessops-report-abc-123.pdf");
  });
});
