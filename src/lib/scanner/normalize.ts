/**
 * Map axe-core's Result objects to our NormalizedIssue shape.
 *
 * axe → AccessOps mapping decisions, documented because tweaking these
 * shifts what appears as "critical" in the UI:
 *
 *   axe.impact   →  severity
 *   ───────────     ────────
 *   critical     →  critical
 *   serious      →  moderate   (impact remains "serious" for scoring)
 *   moderate     →  moderate
 *   minor        →  minor
 *   (missing)    →  review     (incomplete rule — needs human eyes)
 *
 * humanReviewRequired is true when:
 *   - axe returned the result under `incomplete` (it couldn't decide)
 *   - the rule is on a known-noisy list that benefits from manual check
 *     (color-contrast, frame-tested-elements, etc.)
 */
import type { Result as AxeResult, NodeResult } from "axe-core";
import type { Impact, NormalizedIssue, Severity } from "./types";

const NEEDS_HUMAN_REVIEW = new Set<string>([
  "color-contrast",
  "color-contrast-enhanced",
  "frame-tested",
  "scrollable-region-focusable",
  "label-content-name-mismatch",
  "duplicate-id-aria",
]);

const SEVERITY_BY_IMPACT: Record<NonNullable<NodeResult["impact"]>, Severity> = {
  critical: "critical",
  serious: "moderate",
  moderate: "moderate",
  minor: "minor",
};

const IMPACT_NORMALIZE: Record<NonNullable<NodeResult["impact"]>, Impact> = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
};

function extractWcagTags(tags: string[]): string[] {
  // axe tags include things like "wcag2a", "wcag2aa", "wcag22aa", "wcag111",
  // "cat.color", "best-practice". Keep only the WCAG-mapped tags.
  return tags.filter(
    (t) => /^wcag\d/.test(t) || t === "best-practice" || t.startsWith("cat.")
  );
}

export function normalizeAxeViolation(
  result: AxeResult,
  options: { incomplete?: boolean } = {}
): NormalizedIssue[] {
  const incomplete = options.incomplete ?? false;
  const wcagTags = extractWcagTags(result.tags ?? []);
  const baseHumanReview = incomplete || NEEDS_HUMAN_REVIEW.has(result.id);

  // axe groups multiple offending nodes under one rule. Each node
  // becomes its own AccessOps Issue so the remediation board has
  // task-sized units.
  return result.nodes.map<NormalizedIssue>((node) => {
    const impactKey = (node.impact ??
      result.impact ??
      undefined) as keyof typeof SEVERITY_BY_IMPACT | undefined;

    const severity: Severity = incomplete
      ? "review"
      : impactKey
      ? SEVERITY_BY_IMPACT[impactKey]
      : "minor";

    const impact: Impact = impactKey ? IMPACT_NORMALIZE[impactKey] : "minor";

    return {
      ruleId: result.id,
      impact,
      severity,
      wcagTags,
      description: result.description,
      help: result.help,
      helpUrl: result.helpUrl,
      target: (node.target ?? []).map((t) => (Array.isArray(t) ? t.join(" >> ") : String(t))),
      htmlSnippet: typeof node.html === "string" ? node.html.slice(0, 4000) : undefined,
      failureSummary: node.failureSummary,
      humanReviewRequired: baseHumanReview,
    };
  });
}

export function normalizeAxeResults(input: {
  violations: AxeResult[];
  incomplete?: AxeResult[];
}): NormalizedIssue[] {
  const out: NormalizedIssue[] = [];
  for (const v of input.violations) out.push(...normalizeAxeViolation(v));
  for (const v of input.incomplete ?? []) {
    out.push(...normalizeAxeViolation(v, { incomplete: true }));
  }
  return out;
}
