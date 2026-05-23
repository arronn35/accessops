import { createHash } from "node:crypto";
import type {
  Impact,
  NormalizedIssue,
  NormalizedPage,
  ScanScoreSummary,
} from "./types";

export const SCORING_VERSION = "accessops-score-v1";

const IMPACT_WEIGHTS: Record<Impact | "review", number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
  review: 2,
};

const CATEGORY_KEYS = [
  "colorContrast",
  "aria",
  "keyboard",
  "forms",
  "textAlternatives",
  "semanticStructure",
  "language",
  "media",
  "bestPractices",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

export function calculateScanScore(pages: NormalizedPage[]): ScanScoreSummary {
  const pageCount = Math.max(1, pages.length);
  const allIssues = pages.flatMap((page) =>
    page.issues.map((issue) => ({ page, issue }))
  );
  const uniqueIssues = uniqueIssueEntries(allIssues);
  const wcagEntries = uniqueIssues.filter(({ issue }) => isWcagIssue(issue));
  const bestPracticeEntries = uniqueIssues.filter(({ issue }) =>
    isBestPracticeIssue(issue)
  );
  const allWcagEntries = allIssues.filter(({ issue }) => isWcagIssue(issue));
  const allBestPracticeEntries = allIssues.filter(({ issue }) =>
    isBestPracticeIssue(issue)
  );

  const issueCounts = countIssues(uniqueIssues.map((entry) => entry.issue));
  const overallPenalty = calculatePenalty(allWcagEntries.map((entry) => entry.issue));
  const overallScore = clampScore(100 - overallPenalty / Math.sqrt(pageCount));

  const categoryScores = Object.fromEntries(
    CATEGORY_KEYS.map((category) => {
      const entries =
        category === "bestPractices"
          ? allBestPracticeEntries
          : allWcagEntries.filter(({ issue }) => inferCategory(issue) === category);
      const penalty = calculatePenalty(entries.map((entry) => entry.issue));
      return [category, clampScore(100 - penalty / Math.sqrt(pageCount))];
    })
  ) as ScanScoreSummary["categoryScores"];

  const pageScores = pages.map((page) => {
    const pageIssues = page.issues.filter((issue) => isWcagIssue(issue));
    return {
      url: page.url,
      title: page.title,
      score: clampScore(100 - calculatePenalty(pageIssues)),
      issueCounts: countIssues(
        uniqueIssueEntries(page.issues.map((issue) => ({ page, issue }))).map(
          ({ issue }) => issue
        )
      ),
    };
  });

  return {
    overallScore,
    grade: gradeForScore(overallScore),
    riskLevel: riskLevelForScore(overallScore),
    issueCounts,
    wcagIssueCount: wcagEntries.length,
    bestPracticeIssueCount: bestPracticeEntries.length,
    manualReviewCount: uniqueIssues.filter(({ issue }) => isReviewIssue(issue)).length,
    categoryScores,
    pageScores,
    scoringVersion: SCORING_VERSION,
  };
}

function calculatePenalty(issues: NormalizedIssue[]): number {
  const groups = new Map<string, { issue: NormalizedIssue; occurrences: number }>();
  for (const issue of issues) {
    const key = issueFingerprint(issue);
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += 1;
    } else {
      groups.set(key, { issue, occurrences: 1 });
    }
  }

  let penalty = 0;
  for (const { issue, occurrences } of groups.values()) {
    const weight = isReviewIssue(issue)
      ? IMPACT_WEIGHTS.review
      : IMPACT_WEIGHTS[issue.impact];
    const occurrenceFactor = Math.min(3, 1 + Math.log2(occurrences));
    penalty += weight * occurrenceFactor;
  }
  return penalty;
}

function uniqueIssueEntries<T extends { page: NormalizedPage; issue: NormalizedIssue }>(
  entries: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const entry of entries) {
    const key = `${entry.page.url}:${issueFingerprint(entry.issue)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function countIssues(issues: NormalizedIssue[]): ScanScoreSummary["issueCounts"] {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, review: 0 };
  for (const issue of issues) {
    if (isReviewIssue(issue)) {
      counts.review += 1;
    } else {
      counts[issue.impact] += 1;
    }
  }
  return counts;
}

function isReviewIssue(issue: NormalizedIssue): boolean {
  return issue.severity === "review" || issue.humanReviewRequired;
}

function isWcagIssue(issue: NormalizedIssue): boolean {
  return issue.wcagTags.some((tag) => /^wcag\d/i.test(tag));
}

function isBestPracticeIssue(issue: NormalizedIssue): boolean {
  return issue.wcagTags.includes("best-practice");
}

function inferCategory(issue: NormalizedIssue): CategoryKey {
  const id = issue.ruleId;
  const tags = issue.wcagTags.join(" ");
  if (/color-contrast|cat\.color/i.test(`${id} ${tags}`)) return "colorContrast";
  if (/keyboard|focus|tabindex|focus-order/i.test(id)) return "keyboard";
  if (/label|input|select|textarea|form/i.test(id)) return "forms";
  if (/image-alt|alt-|svg-img|non-text|area-alt/i.test(id)) return "textAlternatives";
  if (/heading|landmark|region|main|document-title|page-titled/i.test(id)) {
    return "semanticStructure";
  }
  if (/html-has-lang|valid-lang|language|lang/i.test(id)) return "language";
  if (/video|audio|caption|media|frame-title|iframe/i.test(id)) return "media";
  if (/aria|role|name|button-name|link-name|duplicate-id/i.test(id)) return "aria";
  if (isBestPracticeIssue(issue)) return "bestPractices";
  return "aria";
}

function issueFingerprint(issue: NormalizedIssue): string {
  const target = issue.target.map(normalizeTarget).join("|");
  const snippetHash = createHash("sha1")
    .update(issue.htmlSnippet ?? "")
    .digest("hex")
    .slice(0, 10);
  const reviewFlag = isReviewIssue(issue) ? "review" : "violation";
  return `${issue.ruleId}:${target}:${snippetHash}:${reviewFlag}`;
}

function normalizeTarget(target: string): string {
  return target.replace(/\s+/g, " ").trim();
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeForScore(score: number): ScanScoreSummary["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function riskLevelForScore(score: number): ScanScoreSummary["riskLevel"] {
  if (score >= 85) return "low";
  if (score >= 70) return "medium";
  if (score >= 50) return "high";
  return "critical";
}
