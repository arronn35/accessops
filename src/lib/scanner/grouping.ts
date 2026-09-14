/**
 * Root-cause issue grouping.
 *
 * axe reports one finding per offending DOM node, so a single underlying
 * defect (e.g. a button color used site-wide, or a form where every input
 * lacks a label) explodes into dozens of near-identical rows. This module
 * collapses those raw findings into a small set of *root causes* so the
 * dashboard and report can show one actionable item with an affected-instance
 * count instead of a wall of duplicates.
 *
 * Grouping rules (mirrors the product brief):
 *   - Default: group by ruleId + normalized selector (positional indices
 *     stripped), so the "same element" across pages/viewports collapses.
 *   - color-contrast / color-contrast-enhanced: collapse by the shared
 *     foreground/background color pair parsed from axe's failureSummary, so
 *     one bad color combination used everywhere is a single root cause.
 *   - Manual-review / incomplete findings stay in their own groups, never
 *     merged into confirmed violations.
 *   - WCAG findings and best-practice findings stay in separate groups.
 *
 * Pure module — no DB access — so it is trivially unit-testable. Persistence
 * lives in `persistIssueGroups` (persistence.ts).
 */
import type { Severity } from "./types";

export interface GroupableIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  wcagTags: string[];
  help: string;
  description: string;
  helpUrl?: string | null;
  target?: string[] | null;
  failureSummary?: string | null;
  humanReviewRequired: boolean;
}

export interface DerivedGroup {
  rootCauseKey: string;
  ruleId: string;
  title: string;
  severity: Severity;
  affectedCount: number;
  primaryWcagTag: string | null;
  summary: string;
  recommendedFix: string;
  priority: number;
  /** ids of the raw accessibility_issues rows that belong to this group. */
  issueIds: string[];
  /**
   * Normalized selectors this group covers, deduped and sorted.
   *
   * rootCauseKey is not a stable comparison identity for contrast rules: it
   * embeds the color pair, so recoloring #aaaaaa -> #bbbbbb (still failing)
   * changes the key and the diff reads it as one fixed + one new issue. The
   * element set is what actually persists across such a change, so
   * before/after matching falls back to overlap on these.
   */
  elementKeys: string[];
  /** Identity scheme that produced the keys above; see FINGERPRINT_VERSION. */
  fingerprintVersion: number;
}

export interface GroupingResult {
  groups: DerivedGroup[];
  /** issueId -> rootCauseKey, for assigning groupId after group rows exist. */
  keyByIssueId: Map<string, string>;
}

const CONTRAST_RULES = new Set(["color-contrast", "color-contrast-enhanced"]);

/**
 * Version of the grouping identity scheme.
 *
 * Bump whenever rootCauseKeyFor / normalizeSelector / elementKeyFor change in
 * a way that makes keys from an older scan incomparable. Comparison refuses to
 * assert "fixed" across a version boundary and reports `inconclusive` instead,
 * so a scheme change can never be mistaken for remediation work.
 */
export const FINGERPRINT_VERSION = 2;

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  moderate: 1,
  minor: 2,
  review: 3,
  passed: 4,
};

/** Strip positional/structural noise so "the same element" collapses. */
export function normalizeSelector(target?: string[] | null): string {
  const sel = target?.[0] ?? "";
  return sel
    .replace(/:nth-child\(\d+\)/g, "")
    .replace(/:nth-of-type\(\d+\)/g, "")
    .replace(/:nth-last-child\(\d+\)/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s*>>\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse "(foreground color: #fff, background color: #eee ...)" pairs. */
export function contrastColorPair(failureSummary?: string | null): string | null {
  if (!failureSummary) return null;
  const color = "(#[0-9a-fA-F]{3,8}|rgba?\\([^)]*\\))";
  const fg = failureSummary.match(new RegExp(`foreground color:\\s*${color}`, "i"));
  const bg = failureSummary.match(new RegExp(`background color:\\s*${color}`, "i"));
  if (fg && bg) return `${fg[1].toLowerCase()}|${bg[1].toLowerCase()}`;
  return null;
}

function isReview(issue: GroupableIssue): boolean {
  return issue.severity === "review" || issue.humanReviewRequired;
}

function isBestPractice(issue: GroupableIssue): boolean {
  return !issue.wcagTags.some((t) => /^wcag\d/i.test(t));
}

/**
 * Element-level identity, independent of the styling that happens to be
 * failing. Unlike rootCauseKeyFor this never embeds a color pair.
 */
export function elementKeyFor(issue: GroupableIssue): string {
  const category = isReview(issue) ? "review" : "violation";
  const standard = isBestPractice(issue) ? "bp" : "wcag";
  return `${category}:${standard}:${issue.ruleId}:${normalizeSelector(issue.target)}`;
}

export function rootCauseKeyFor(issue: GroupableIssue): string {
  const category = isReview(issue) ? "review" : "violation";
  const standard = isBestPractice(issue) ? "bp" : "wcag";
  let discriminator: string;
  if (CONTRAST_RULES.has(issue.ruleId)) {
    discriminator =
      contrastColorPair(issue.failureSummary) ?? normalizeSelector(issue.target);
  } else {
    discriminator = normalizeSelector(issue.target);
  }
  return `${category}:${standard}:${issue.ruleId}:${discriminator}`;
}

/**
 * Lower number = address sooner. Mirrors the brief's roadmap ordering:
 * critical blockers → keyboard/forms → contrast → semantic structure →
 * everything else → manual review last.
 */
export function priorityFor(args: {
  ruleId: string;
  severity: Severity;
  isReview: boolean;
}): number {
  if (args.isReview) return 90;
  if (args.severity === "critical") return 10;
  const r = args.ruleId;
  if (/label|form|input|select|textarea|button-name|aria-required|autocomplete/.test(r)) {
    return 20;
  }
  if (/keyboard|focus|tabindex|scrollable|accesskey|interactive/.test(r)) return 25;
  if (/color-contrast/.test(r)) return 30;
  if (/heading|landmark|region|list|definition|html-has-lang|valid-lang|document-title|bypass|page-has/.test(r)) {
    return 40;
  }
  if (args.severity === "moderate") return 50;
  if (args.severity === "minor") return 60;
  return 70;
}

function primaryWcagTag(tags: string[]): string | null {
  return tags.find((t) => /^wcag\d/i.test(t)) ?? tags[0] ?? null;
}

export function groupIssues(issues: GroupableIssue[]): GroupingResult {
  const byKey = new Map<string, GroupableIssue[]>();
  const keyByIssueId = new Map<string, string>();

  for (const issue of issues) {
    const key = rootCauseKeyFor(issue);
    keyByIssueId.set(issue.id, key);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(issue);
    else byKey.set(key, [issue]);
  }

  const groups: DerivedGroup[] = [];
  for (const [rootCauseKey, members] of byKey) {
    // Severity of a group is its worst member.
    const severity = members.reduce<Severity>(
      (worst, m) => (SEVERITY_RANK[m.severity] < SEVERITY_RANK[worst] ? m.severity : worst),
      "passed"
    );
    const representative = members[0];
    const review = isReview(representative);
    groups.push({
      rootCauseKey,
      ruleId: representative.ruleId,
      title: representative.help,
      severity,
      affectedCount: members.length,
      primaryWcagTag: primaryWcagTag(representative.wcagTags),
      summary: representative.description,
      recommendedFix: representative.help,
      priority: priorityFor({ ruleId: representative.ruleId, severity, isReview: review }),
      issueIds: members.map((m) => m.id),
      elementKeys: [...new Set(members.map(elementKeyFor))].sort(),
      fingerprintVersion: FINGERPRINT_VERSION,
    });
  }

  groups.sort(
    (a, b) => a.priority - b.priority || b.affectedCount - a.affectedCount
  );

  return { groups, keyByIssueId };
}
