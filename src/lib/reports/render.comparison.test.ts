import { expect, it } from "vitest";
import { renderHtml, renderCsv, renderJson, type ReportInput } from "./render";
import { buildComparisonProfile } from "../scanner/comparison-profile";
it("preserves comparison uncertainty and profile in every export, including empty findings", () => {
  const input: ReportInput = { title: "Test", workspaceName: "Test", scanId: "scan", baseUrl: "https://example.com", pagesScanned: 0, scanDate: new Date(), issues: [], counts: { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 }, comparisonProfile: buildComparisonProfile([]), comparisonEvidence: { comparable: false, reasons: ["PROFILE_MISSING"], verificationStatus: "inconclusive" } };
  for (const render of [renderHtml, renderCsv, renderJson]) {
    expect(render(input)).toContain("PROFILE_MISSING");
    expect(render(input)).toContain("scoringVersion");
  }
});
