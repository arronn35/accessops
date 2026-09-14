/**
 * F11 acceptance: an unchanged scan is silent, a new critical finding produces
 * exactly one alert, and a retry produces no duplicate.
 *
 * The interesting cases are the ones that must NOT alert — those are what turn
 * a monitoring channel into noise people stop reading.
 */
import { describe, expect, it } from "vitest";
import {
  decideRegressionAlerts,
  regressionAlertKey,
  type AlertThreshold,
} from "./regression";
import type { CompareGroupResult, ScanComparison } from "@/lib/scanner/compare";

const THRESHOLD: AlertThreshold = { onNewCritical: true, onScoreDropBy: 10 };

function group(over: Partial<CompareGroupResult> = {}): CompareGroupResult {
  return {
    verificationStatus: "verification_pending",
    rootCauseKey: "k",
    ruleId: "button-name",
    title: "Buttons missing names",
    severity: "critical",
    primaryWcagTag: "wcag412",
    priority: 10,
    beforeCount: 0,
    afterCount: 3,
    status: "new",
    ...over,
  };
}

function comparison(over: Partial<ScanComparison> = {}): ScanComparison {
  return {
    fixed: [],
    newIssues: [],
    remaining: [],
    manualReview: [],
    notObserved: [],
    inconclusive: [],
    coverage: {
      reasons: [],
      missingFromAfter: [],
      addedInAfter: [],
      afterFailedPageCount: 0,
      identityComparable: true,
      scopeEquivalent: true,
    },
    totals: {
      fixed: 0,
      new: 0,
      remaining: 0,
      notObserved: 0,
      inconclusive: 0,
      instancesResolved: 0,
      instancesIntroduced: 0,
    },
    score: null,
    ...over,
  };
}

describe("decideRegressionAlerts", () => {
  it("stays silent when nothing changed", () => {
    expect(decideRegressionAlerts(comparison(), THRESHOLD)).toEqual([]);
  });

  it("raises exactly one alert for new critical findings", () => {
    const alerts = decideRegressionAlerts(
      comparison({ newIssues: [group(), group({ rootCauseKey: "k2" })] }),
      THRESHOLD
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("new_critical");
    expect(alerts[0].title).toBe("2 new critical issues");
    expect(alerts[0].body).toContain("6 affected elements");
  });

  it("ignores new findings that are not critical", () => {
    const alerts = decideRegressionAlerts(
      comparison({ newIssues: [group({ severity: "moderate" })] }),
      THRESHOLD
    );

    expect(alerts).toEqual([]);
  });

  it("does not alert on a finding we simply could not observe", () => {
    // A page that failed to load is not a regression.
    const alerts = decideRegressionAlerts(
      comparison({
        notObserved: [group({ status: "not_observed" })],
        coverage: {
          reasons: [],
      missingFromAfter: ["https://example.com/pricing"],
          addedInAfter: [],
          afterFailedPageCount: 1,
          identityComparable: true,
          scopeEquivalent: false,
        },
      }),
      THRESHOLD
    );

    expect(alerts).toEqual([]);
  });

  it("says nothing at all when the two scans are not comparable", () => {
    const alerts = decideRegressionAlerts(
      comparison({
        newIssues: [group()],
        inconclusive: [group({ status: "inconclusive" })],
        coverage: {
          reasons: [],
      missingFromAfter: [],
          addedInAfter: [],
          afterFailedPageCount: 0,
          identityComparable: false,
          scopeEquivalent: true,
        },
      }),
      THRESHOLD
    );

    expect(alerts).toEqual([]);
  });

  it("alerts on a score drop at or beyond the threshold", () => {
    const alerts = decideRegressionAlerts(
      comparison({
        score: {
          before: 90,
          after: 78,
          delta: -12,
          beforeGrade: "A",
          afterGrade: "C",
          direction: "down",
        },
      }),
      THRESHOLD
    );

    expect(alerts.map((a) => a.kind)).toEqual(["score_drop"]);
    expect(alerts[0].title).toContain("12 points");
  });

  it("ignores a drop smaller than the threshold", () => {
    const alerts = decideRegressionAlerts(
      comparison({
        score: {
          before: 90, after: 85, delta: -5,
          beforeGrade: "A", afterGrade: "B", direction: "down",
        },
      }),
      THRESHOLD
    );

    expect(alerts).toEqual([]);
  });

  it("never alerts on an improvement", () => {
    const alerts = decideRegressionAlerts(
      comparison({
        fixed: [group({ status: "fixed" })],
        score: {
          before: 70, after: 95, delta: 25,
          beforeGrade: "C", afterGrade: "A", direction: "up",
        },
      }),
      THRESHOLD
    );

    expect(alerts).toEqual([]);
  });

  it("honours the per-monitor thresholds", () => {
    const both = comparison({
      newIssues: [group()],
      score: {
        before: 90, after: 60, delta: -30,
        beforeGrade: "A", afterGrade: "D", direction: "down",
      },
    });

    expect(decideRegressionAlerts(both, THRESHOLD)).toHaveLength(2);
    expect(
      decideRegressionAlerts(both, { onNewCritical: false, onScoreDropBy: 0 })
    ).toEqual([]);
  });
});

describe("regressionAlertKey", () => {
  it("is stable for the same scan and kind, so a retry cannot duplicate", () => {
    expect(regressionAlertKey("scan-1", "new_critical")).toBe(
      regressionAlertKey("scan-1", "new_critical")
    );
  });

  it("separates kinds and scans", () => {
    expect(regressionAlertKey("scan-1", "new_critical")).not.toBe(
      regressionAlertKey("scan-1", "score_drop")
    );
    expect(regressionAlertKey("scan-1", "new_critical")).not.toBe(
      regressionAlertKey("scan-2", "new_critical")
    );
  });
});
