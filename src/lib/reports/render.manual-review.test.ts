/**
 * F08: manual-review results are team evidence, not one browser's localStorage.
 *
 * The report is the artifact a client actually receives, so these assert the
 * thing that matters: a recorded verdict reaches the report attributed to the
 * person who made it, and an unreviewed scan says so rather than implying the
 * checks were done.
 */
import { describe, expect, it } from "vitest";
import { renderHtml, type ReportInput, type ReportManualReview } from "./render";
import { MANUAL_CHECKS } from "@/lib/compliance/manual-checks";

function review(over: Partial<ReportManualReview> = {}): ReportManualReview {
  return {
    checkId: "keyboard",
    title: "Keyboard-only walkthrough",
    status: "failed",
    notes: "Focus is trapped in the cookie dialog.",
    wcagCriteria: ["2.1.1", "2.1.2"],
    reviewerName: "Ada Lovelace",
    reviewedAt: new Date("2026-03-03T10:00:00Z"),
    revision: 1,
    ...over,
  };
}

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    title: "Report",
    workspaceName: "Acme",
    scanId: "scan-1",
    baseUrl: "https://example.com",
    pagesScanned: 1,
    scanDate: new Date("2026-03-01T10:00:00Z"),
    issues: [],
    counts: { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 },
    ...over,
  };
}

describe("manual review in the report", () => {
  it("cites the reviewer, the verdict, the note and the criteria", () => {
    const html = renderHtml(input({ manualReviews: [review()] }));

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Failed");
    expect(html).toContain("Focus is trapped in the cookie dialog.");
    expect(html).toContain("2.1.1");
  });

  it("says plainly when nobody has reviewed the scan", () => {
    const html = renderHtml(input({ manualReviews: [] }));

    expect(html).toContain("No manual review has been recorded");
    // Every guided check should still be listed as outstanding work.
    for (const check of MANUAL_CHECKS) {
      expect(html).toContain(check.title);
    }
  });

  it("does not present a pending verdict as a completed review", () => {
    const html = renderHtml(input({ manualReviews: [review({ status: "pending" })] }));

    expect(html).toContain("No manual review has been recorded");
  });

  it("lists only the unreviewed checks as outstanding", () => {
    const html = renderHtml(input({ manualReviews: [review({ status: "passed" })] }));

    expect(html).toContain("Still outstanding:");
    // The reviewed one is reported as a result, not as outstanding work.
    const outstanding = html.slice(html.indexOf("Still outstanding:"));
    expect(outstanding).not.toContain("Keyboard-only walkthrough");
    expect(outstanding).toContain("Screen reader pass");
  });

  it("shows the revision when a verdict has been changed", () => {
    const html = renderHtml(input({ manualReviews: [review({ revision: 3 })] }));

    expect(html).toContain("rev 3");
  });

  it("marks an unattributed record rather than inventing a reviewer", () => {
    const html = renderHtml(
      input({ manualReviews: [review({ reviewerName: null })] })
    );

    expect(html).toContain("Unattributed");
  });

  it("escapes reviewer-supplied notes", () => {
    const html = renderHtml(
      input({
        manualReviews: [review({ notes: "<img src=x onerror=alert(1)>" })],
      })
    );

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });
});
