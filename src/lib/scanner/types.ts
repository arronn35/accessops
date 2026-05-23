/**
 * Shared types for the scanner module. These are deliberately
 * decoupled from Drizzle so the scanner can be unit-tested without
 * a DB connection.
 */

export type Severity = "critical" | "moderate" | "minor" | "passed" | "review";
export type Impact = "minor" | "moderate" | "serious" | "critical";
export type ScanViewportName = "desktop" | "mobile";
export type ScanState =
  | "initial"
  | "menu-open"
  | "dialog-open"
  | "accordion-open"
  | "tab-open"
  | "form-focus";
export type ResultConfidence = "high" | "medium" | "low";

export interface ScanViewport {
  name: ScanViewportName;
  width: number;
  height: number;
}

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
  timeoutMs: number;
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
}

export interface NormalizedPage {
  url: string;
  title: string | null;
  statusCode: number | null;
  scannedAt: Date;
  screenshotPath?: string;
  rawMetadata?: Record<string, unknown>;
  issues: NormalizedIssue[];
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
