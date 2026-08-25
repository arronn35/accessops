import { calculateScanScore } from "./scoring";
import { runStaticScanJob } from "./static-runner";
import type { Impact, NormalizedIssue, ScanScoreSummary } from "./types";

const PUBLIC_CHECK_TIMEOUT_MS = 12_000;
const TOP_FINDING_LIMIT = 5;

const IMPACT_ORDER: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

export interface PublicCheckFinding {
  ruleId: string;
  impact: Impact;
  description: string;
  help: string;
  wcagTags: string[];
  humanReviewRequired: boolean;
}

export interface PublicCheckResult {
  url: string;
  title: string | null;
  score: number;
  grade: ScanScoreSummary["grade"];
  riskLevel: ScanScoreSummary["riskLevel"];
  issueCounts: ScanScoreSummary["issueCounts"];
  wcagIssueCount: number;
  bestPracticeIssueCount: number;
  manualReviewCount: number;
  topFindings: PublicCheckFinding[];
  durationMs: number;
  engine: "static-html-preview";
  confidence: "low";
  persisted: false;
  limitations: string[];
}

export class PublicCheckUnavailable extends Error {
  constructor(public readonly code: "page_unavailable") {
    super(code);
    this.name = "PublicCheckUnavailable";
  }
}

/**
 * Run a deliberately bounded, ephemeral acquisition preview.
 *
 * This is not the authenticated browser scanner. It inspects the initial HTML
 * response only, returns no raw HTML/snippets/selectors, and persists nothing.
 * Keeping that boundary explicit makes the public endpoint cheap enough to
 * validate the funnel without exposing Playwright capacity to anonymous use.
 */
export async function runPublicCheck(url: string): Promise<PublicCheckResult> {
  const outcome = await runStaticScanJob({
    jobId: "public-preview",
    url,
    maxPages: 1,
    scanType: "single",
    includeScreenshots: false,
    storeScreenshots: false,
    timeoutMs: PUBLIC_CHECK_TIMEOUT_MS,
  });
  const score = calculateScanScore(outcome.pages);
  const page = outcome.pages[0];

  if (!page || !score || page.scanFailed) {
    throw new PublicCheckUnavailable("page_unavailable");
  }

  return {
    url: page.url,
    title: page.title,
    score: score.overallScore,
    grade: score.grade,
    riskLevel: score.riskLevel,
    issueCounts: score.issueCounts,
    wcagIssueCount: score.wcagIssueCount,
    bestPracticeIssueCount: score.bestPracticeIssueCount,
    manualReviewCount: score.manualReviewCount,
    topFindings: [...page.issues]
      .sort(compareFindings)
      .slice(0, TOP_FINDING_LIMIT)
      .map(toPublicFinding),
    durationMs: outcome.durationMs,
    engine: "static-html-preview",
    confidence: "low",
    persisted: false,
    limitations: [
      "This preview checks the initial HTML response only; it does not run JavaScript or test interactive states.",
      "Automated checks cannot establish WCAG, ADA, EAA, or legal compliance.",
      "Sign in for the full browser scan across desktop, tablet, mobile, and interactive states.",
    ],
  };
}

function compareFindings(a: NormalizedIssue, b: NormalizedIssue): number {
  if (a.humanReviewRequired !== b.humanReviewRequired) {
    return a.humanReviewRequired ? 1 : -1;
  }
  return IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
}

function toPublicFinding(issue: NormalizedIssue): PublicCheckFinding {
  return {
    ruleId: issue.ruleId,
    impact: issue.impact,
    description: issue.description,
    help: issue.help,
    wcagTags: issue.wcagTags.filter((tag) => /^wcag\d/i.test(tag)),
    humanReviewRequired: issue.humanReviewRequired,
  };
}
