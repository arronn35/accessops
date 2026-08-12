/**
 * Shared types for the scanner module. These are deliberately
 * decoupled from the persistence layer so the scanner can be
 * unit-tested without a database connection.
 */

export type Severity = "critical" | "moderate" | "minor" | "passed" | "review";
export type Impact = "minor" | "moderate" | "serious" | "critical";
export type ScanViewportName = "desktop" | "tablet" | "mobile";
export type ScanState =
  | "initial"
  | "menu-open"
  | "dialog-open"
  | "accordion-open"
  | "tab-open"
  | "form-focus";
export type ResultConfidence = "high" | "medium" | "low";
export type ScannerErrorCode =
  | "browser_launch_failed"
  | "navigation_failed"
  | "axe_failed"
  | "deadline_exceeded"
  | "page_deadline_exceeded"
  | "scan_timeout"
  | "state_unavailable"
  | "page_unavailable";

export interface ScanViewport {
  name: ScanViewportName;
  width: number;
  height: number;
}

/**
 * Canonical viewport matrix every scan runs through. Defined here (rather
 * than inline in the Playwright runner) so it can be imported and asserted
 * without pulling in the browser engine. Order is widest → narrowest.
 */
export const SCAN_VIEWPORTS: readonly ScanViewport[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/**
 * Interactive UI states each page variant is re-scanned in, beyond the
 * initial load. Defined here (engine-free) so the duration estimate can be
 * computed from the SAME source of truth the Playwright runner iterates over,
 * eliminating any drift between the new-scan form estimate and reality.
 */
export const SCAN_INTERACTIVE_STATES: readonly Exclude<ScanState, "initial">[] = [
  "menu-open",
  "dialog-open",
  "accordion-open",
  "tab-open",
  "form-focus",
] as const;

/** Distinct DOM candidates probed per interactive state (e.g. first 2 menus). */
export const SCAN_STATE_CANDIDATE_LIMIT = 2;

export interface IssueContext {
  viewport: ScanViewportName;
  state: ScanState;
}

export interface ScanInput {
  jobId: string;
  url: string;
  sourceUrls?: string[];
  sitemapUrl?: string | null;
  maxPages: number;
  scanType: "single" | "multi" | "sitemap" | "manual";
  includeScreenshots: boolean;
  storeScreenshots: boolean;
  visualEvidenceEnabled?: boolean;
  visualEvidenceMaxScreenshots?: number;
  timeoutMs: number;
}

export type ScreenshotStatus = "pending" | "captured" | "skipped" | "failed" | "redacted";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualEvidenceMetadata {
  visualEvidenceEnabled: boolean;
  screenshotPath?: string;
  screenshotKey?: string;
  screenshotStatus: ScreenshotStatus;
  screenshotFailureReason?: string;
  boundingBox?: BoundingBox;
  viewport?: ScanViewport;
  state?: ScanState;
  selector?: string;
  redactionApplied: boolean;
  imageBuffer?: Buffer;
}

export interface NormalizedIssue {
  ruleId: string;
  impact: Impact;
  severity: Severity;
  wcagTags: string[];
  description: string;
  help: string;
  helpUrl?: string;
  target: string[]; // CSS selectors
  htmlSnippet?: string;
  failureSummary?: string;
  humanReviewRequired: boolean;
  contexts?: IssueContext[];
  visualEvidence?: VisualEvidenceMetadata;
}

export interface NormalizedPage {
  url: string;
  title: string | null;
  statusCode: number | null;
  scannedAt: Date;
  /** The page never reached an accessibility analysis result. */
  scanFailed?: boolean;
  /** Machine-readable reason for an unscored page. */
  failureCode?: ScannerErrorCode;
  screenshotPath?: string;
  rawMetadata?: ScannerPageMetadata;
  issues: NormalizedIssue[];
}

export interface ScannerPageMetadata {
  [key: string]: unknown;
  engine?: string;
  scanner?: string;
  fallbackMode?: boolean;
  resultConfidence?: ResultConfidence;
  code?: ScannerErrorCode;
  message?: string;
  scanFailed?: boolean;
  failureCode?: ScannerErrorCode;
  truncatedByDeadline?: boolean;
  playwrightVersion?: string | null;
  axeVersion?: string | null;
  variantCount?: number;
  variants?: unknown[];
}

export interface ScanScoreSummary {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  riskLevel: "low" | "medium" | "high" | "critical";
  issueCounts: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    review: number;
  };
  wcagIssueCount: number;
  bestPracticeIssueCount: number;
  manualReviewCount: number;
  categoryScores: Record<
    | "colorContrast"
    | "aria"
    | "keyboard"
    | "forms"
    | "textAlternatives"
    | "semanticStructure"
    | "language"
    | "media"
    | "bestPractices",
    number
  >;
  pageScores: Array<{
    url: string;
    title: string | null;
    score: number;
    issueCounts: ScanScoreSummary["issueCounts"];
  }>;
  /** Pages excluded because no accessibility analysis completed. */
  pagesFailedToScan: number;
  /** Failed URLs are reported separately and never receive a page score. */
  failedPageUrls: string[];
  scoringVersion: string;
}

export interface ScanOutcome {
  pages: NormalizedPage[];
  pagesDiscovered: number;
  pagesScanned: number;
  durationMs: number;
}

export type ProgressStep =
  | "queued"
  | "starting_browser"
  | "crawling"
  | "scanning"
  | "processing"
  | "saving"
  | "completed"
  | "failed";

export interface ProgressUpdate {
  step: ProgressStep;
  pagesScanned: number;
  pagesDiscovered: number;
  currentUrl?: string;
  message?: string;
  /**
   * Sub-page granularity for long single pages: which viewport/state batch is
   * currently being analyzed (e.g. "desktop · menu-open"). Set on per-variant
   * progress pings so the realtime UI keeps moving and the heartbeat stays
   * fresh even while a single page runs all 33 analysis passes.
   */
  currentState?: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void | Promise<void>;
