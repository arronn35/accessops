import { describe, expect, it } from "vitest";
import {
  ANALYSIS_PASSES_PER_PAGE,
  ANALYSIS_PASSES_PER_VIEWPORT,
  SCAN_VIEWPORT_COUNT,
  estimateScanPlan,
  estimatedPageCount,
  formatDurationEstimate,
} from "./estimate";
import {
  SCAN_INTERACTIVE_STATES,
  SCAN_STATE_CANDIDATE_LIMIT,
} from "./types";

describe("scan estimate constants", () => {
  it("derives passes from the same source of truth the runner iterates", () => {
    // 1 initial load + states × candidates, per viewport.
    expect(ANALYSIS_PASSES_PER_VIEWPORT).toBe(
      1 + SCAN_INTERACTIVE_STATES.length * SCAN_STATE_CANDIDATE_LIMIT
    );
  });

  it("matches the real worker plan (3 viewports × 11 = 33), not the old 18", () => {
    expect(SCAN_VIEWPORT_COUNT).toBe(3);
    expect(ANALYSIS_PASSES_PER_VIEWPORT).toBe(11);
    expect(ANALYSIS_PASSES_PER_PAGE).toBe(33);
  });
});

describe("estimatedPageCount", () => {
  it("single is always one page", () => {
    expect(estimatedPageCount({ scanType: "single", maxPages: 50 })).toBe(1);
  });
  it("manual counts the provided URLs", () => {
    expect(estimatedPageCount({ scanType: "manual", manualUrlCount: 4 })).toBe(4);
    expect(estimatedPageCount({ scanType: "manual", manualUrlCount: 0 })).toBe(1);
  });
  it("multi/sitemap use the page cap", () => {
    expect(estimatedPageCount({ scanType: "multi", maxPages: 5 })).toBe(5);
    expect(estimatedPageCount({ scanType: "sitemap", maxPages: 12 })).toBe(12);
  });
});

describe("estimateScanPlan", () => {
  it("computes total passes from pages × passes-per-page", () => {
    const plan = estimateScanPlan({ scanType: "multi", maxPages: 3 });
    expect(plan.pages).toBe(3);
    expect(plan.passesPerPage).toBe(33);
    expect(plan.totalPasses).toBe(99);
  });

  it("adds screenshot time only when screenshots are enabled", () => {
    const base = estimateScanPlan({ scanType: "single" });
    const withShots = estimateScanPlan({ scanType: "single", includeScreenshots: true });
    expect(withShots.estSeconds).toBeGreaterThan(base.estSeconds);
  });

  it("formats short estimates in seconds and long ones in minutes", () => {
    expect(formatDurationEstimate(45)).toBe("45s");
    expect(formatDurationEstimate(90)).toBe("2 min");
    expect(formatDurationEstimate(200)).toBe("4 min");
  });
});
