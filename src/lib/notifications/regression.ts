/**
 * Deciding whether a re-scan is worth telling someone about.
 *
 * Monitoring only earns its keep if it interrupts a person when something
 * actually got worse — and stays quiet otherwise. Two failure modes matter
 * equally: a silent regression, and an alert every run that trains people to
 * ignore the channel.
 *
 * This is deliberately built on ScanComparison rather than on raw issue counts,
 * because the comparison already knows the difference between "this finding is
 * new" and "we could not check the page it was on". A `not_observed` or
 * `inconclusive` verdict must never become an alert: telling someone their site
 * regressed because a page failed to load is worse than saying nothing.
 *
 * Pure module — no I/O — so the policy is unit-testable on its own.
 */
import type { ScanComparison } from "@/lib/scanner/compare";

export type RegressionAlertKind = "new_critical" | "score_drop";

export interface RegressionAlert {
  kind: RegressionAlertKind;
  title: string;
  body: string;
}

export interface AlertThreshold {
  onNewCritical: boolean;
  /** Alert when the score falls by at least this many points; 0 disables it. */
  onScoreDropBy: number;
}

export function decideRegressionAlerts(
  comparison: ScanComparison,
  threshold: AlertThreshold
): RegressionAlert[] {
  // Without a comparable identity scheme the diff cannot support any claim,
  // let alone one that pages a human.
  if (!comparison.coverage.identityComparable) return [];

  const alerts: RegressionAlert[] = [];

  if (threshold.onNewCritical) {
    // Only confirmed-new findings. notObserved and inconclusive are explicitly
    // not evidence that anything changed.
    const newCritical = comparison.newIssues.filter((g) => g.severity === "critical");
    if (newCritical.length > 0) {
      const instances = newCritical.reduce((sum, g) => sum + g.afterCount, 0);
      alerts.push({
        kind: "new_critical",
        title: `${newCritical.length} new critical ${
          newCritical.length === 1 ? "issue" : "issues"
        }`,
        body: `${newCritical[0].title}${
          newCritical.length > 1 ? ` and ${newCritical.length - 1} more` : ""
        } — ${instances} affected element${instances === 1 ? "" : "s"}.`,
      });
    }
  }

  if (threshold.onScoreDropBy > 0 && comparison.score) {
    const drop = -comparison.score.delta;
    if (drop >= threshold.onScoreDropBy) {
      alerts.push({
        kind: "score_drop",
        title: `Accessibility score dropped ${drop} points`,
        body: `${comparison.score.before} → ${comparison.score.after} (${comparison.score.beforeGrade} → ${comparison.score.afterGrade}).`,
      });
    }
  }

  return alerts;
}

/**
 * Stable identity for one alert about one scan.
 *
 * A monitor run can be retried, and the sweep that evaluates it runs every
 * couple of minutes, so the same alert will be decided more than once. Writing
 * it under a deterministic key makes the repeat an overwrite instead of a
 * second notification.
 */
export function regressionAlertKey(scanJobId: string, kind: RegressionAlertKind): string {
  return `regression-${scanJobId}-${kind}`;
}
