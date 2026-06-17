/**
 * Single source of truth for scan scope + duration estimates.
 *
 * Both the new-scan form (pre-flight "estimated scope") and the worker derive
 * the analysis-pass count from the SAME constants the Playwright runner
 * iterates over, so the form can never drift from reality again (this is what
 * caused the old 18-vs-33 mismatch: the form counted `1 + states` per viewport
 * but the runner runs `1 + states × candidates`).
 *
 * Engine-free: imports only constants from `./types`, never the Playwright
 * runner, so it is safe to import into client components.
 */
import {
  SCAN_VIEWPORTS,
  SCAN_INTERACTIVE_STATES,
  SCAN_STATE_CANDIDATE_LIMIT,
} from "./types";

export const SCAN_VIEWPORT_COUNT = SCAN_VIEWPORTS.length;

/**
 * Worst-case axe passes per page per viewport:
 *   1 initial load + (each interactive state × candidates probed).
 */
export const ANALYSIS_PASSES_PER_VIEWPORT =
  1 + SCAN_INTERACTIVE_STATES.length * SCAN_STATE_CANDIDATE_LIMIT;

/** Worst-case axe passes for one page across every viewport. */
export const ANALYSIS_PASSES_PER_PAGE =
  SCAN_VIEWPORT_COUNT * ANALYSIS_PASSES_PER_VIEWPORT;

// Rough heuristics, calibrated against observed runs. Bounded estimates, not
// guarantees — the UI always frames them as approximate.
const SECONDS_PER_PASS = 2;
const SCREENSHOT_SECONDS_PER_PAGE = 1.5;

export interface ScanScopeInput {
  scanType: "single" | "multi" | "sitemap" | "manual";
  /** Page cap for crawl/sitemap scans. */
  maxPages?: number;
  /** Explicit URL count for manual scans. */
  manualUrlCount?: number;
  includeScreenshots?: boolean;
}

export interface ScanPlanEstimate {
  pages: number;
  viewports: number;
  passesPerPage: number;
  totalPasses: number;
  estSeconds: number;
  estLabel: string;
}

/** Pages this scan type will actually visit (mirrors the runner's source plan). */
export function estimatedPageCount(input: ScanScopeInput): number {
  if (input.scanType === "single") return 1;
  if (input.scanType === "manual") return Math.max(1, input.manualUrlCount ?? 0);
  return Math.max(1, input.maxPages ?? 1);
}

/** Compute the scope + duration estimate for a planned scan. */
export function estimateScanPlan(input: ScanScopeInput): ScanPlanEstimate {
  const pages = estimatedPageCount(input);
  const passesPerPage = ANALYSIS_PASSES_PER_PAGE;
  const totalPasses = pages * passesPerPage;
  const estSeconds = Math.round(
    totalPasses * SECONDS_PER_PASS +
      (input.includeScreenshots ? pages * SCREENSHOT_SECONDS_PER_PAGE : 0)
  );
  return {
    pages,
    viewports: SCAN_VIEWPORT_COUNT,
    passesPerPage,
    totalPasses,
    estSeconds,
    estLabel: formatDurationEstimate(estSeconds),
  };
}

export function formatDurationEstimate(seconds: number): string {
  return seconds < 90 ? `${seconds}s` : `${Math.ceil(seconds / 60)} min`;
}
