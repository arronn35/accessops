/**
 * Shared types for the scanner module. These are deliberately
 * decoupled from Drizzle so the scanner can be unit-tested without
 * a DB connection.
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
}

export type ProgressCallback = (update: ProgressUpdate) => void | Promise<void>;
