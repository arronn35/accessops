/**
 * Which legal / regulatory framework references which WCAG criterion.
 *
 * This is a *reference map*, not a compliance verdict. Each framework below
 * incorporates a frozen version of WCAG, so whether a finding is in scope for
 * a given law depends on the WCAG version that introduced the criterion. That
 * is the entire logic in this file:
 *
 *   EN 301 549 v3.2.1 (2021)  → WCAG 2.1 Level A + AA, as clause 9.x
 *                               (clause number = "9." + criterion number).
 *   European Accessibility    → Directive (EU) 2019/882; conformity is
 *   Act (EAA)                   presumed via the harmonised standard, i.e.
 *                               EN 301 549. Scope follows EN 301 549.
 *   Section 508 (Revised)     → 36 CFR 1194 App. A, E205.4 incorporates
 *                               WCAG 2.0 Level A + AA by reference.
 *   ADA Title II (2024 rule)  → 28 CFR 35.200 adopts WCAG 2.1 Level AA for
 *                               state/local government web content.
 *
 * Deliberately NOT modelled: ADA Title III (no technical standard is
 * incorporated in the regulation), and any notion of "passing". A criterion
 * being referenced by a framework says the criterion is in scope — nothing
 * about whether an organisation is compliant. Automated testing covers only a
 * portion of any of these standards; see COMPLIANCE_COPY.
 */
import {
  WCAG_CRITERIA,
  compareCriteria,
  criteriaFromAxeTags,
  type WcagCriterion,
} from "./wcag-criteria";

export type FrameworkId = "wcag21aa" | "wcag22aa" | "en301549" | "eaa" | "section508" | "ada-title-ii";

export interface Framework {
  id: FrameworkId;
  /** Short label for badges. */
  label: string;
  /** Full name for reports. */
  name: string;
  /** The instrument that makes it binding, where one exists. */
  basis: string;
  /** WCAG version + level this framework references. */
  references: string;
}

export const FRAMEWORKS: Record<FrameworkId, Framework> = {
  wcag21aa: {
    id: "wcag21aa",
    label: "WCAG 2.1 AA",
    name: "Web Content Accessibility Guidelines 2.1, Level AA",
    basis: "W3C Recommendation",
    references: "WCAG 2.1 A + AA",
  },
  wcag22aa: {
    id: "wcag22aa",
    label: "WCAG 2.2 AA",
    name: "Web Content Accessibility Guidelines 2.2, Level AA",
    basis: "W3C Recommendation",
    references: "WCAG 2.2 A + AA",
  },
  en301549: {
    id: "en301549",
    label: "EN 301 549",
    name: "EN 301 549 v3.2.1 — Accessibility requirements for ICT products and services",
    basis: "Harmonised European standard, clause 9 (Web)",
    references: "WCAG 2.1 A + AA",
  },
  eaa: {
    id: "eaa",
    label: "EAA",
    name: "European Accessibility Act — Directive (EU) 2019/882",
    basis: "EU directive; presumption of conformity via EN 301 549",
    references: "WCAG 2.1 A + AA (through EN 301 549)",
  },
  section508: {
    id: "section508",
    label: "Section 508",
    name: "Section 508 of the Rehabilitation Act (Revised 2017)",
    basis: "36 CFR 1194 Appendix A, E205.4",
    references: "WCAG 2.0 A + AA",
  },
  "ada-title-ii": {
    id: "ada-title-ii",
    label: "ADA Title II",
    name: "ADA Title II web accessibility rule (2024)",
    basis: "28 CFR 35.200 — public entities",
    references: "WCAG 2.1 AA",
  },
};

export interface CriterionMapping {
  criterion: WcagCriterion;
  frameworks: FrameworkId[];
  /** EN 301 549 clause, when the criterion is in that standard. */
  en301549Clause: string | null;
}

/** Frameworks that reference a single criterion. */
export function frameworksForCriterion(criterion: WcagCriterion): FrameworkId[] {
  const ids: FrameworkId[] = [];
  const inWcag20 = criterion.since === "2.0";
  const inWcag21 = criterion.since === "2.0" || criterion.since === "2.1";

  if (inWcag21) ids.push("wcag21aa");
  // 4.1.1 Parsing was removed in WCAG 2.2, so a 2.2 assessment excludes it.
  if (criterion.removedIn !== "2.2") ids.push("wcag22aa");
  if (inWcag21) {
    ids.push("en301549", "eaa", "ada-title-ii");
  }
  if (inWcag20) ids.push("section508");
  return ids;
}

/** EN 301 549 numbers web criteria as clause 9.<criterion>. */
export function en301549Clause(criterion: WcagCriterion): string | null {
  if (criterion.since === "2.2") return null; // not in v3.2.1 (WCAG 2.1 based)
  return `9.${criterion.num}`;
}

export function mapCriterion(criterion: WcagCriterion): CriterionMapping {
  return {
    criterion,
    frameworks: frameworksForCriterion(criterion),
    en301549Clause: en301549Clause(criterion),
  };
}

export interface IssueFrameworkMapping {
  criteria: CriterionMapping[];
  /** Union of every framework any of the issue's criteria falls under. */
  frameworks: FrameworkId[];
  /** True when axe gave no WCAG tag at all (best-practice rules). */
  bestPracticeOnly: boolean;
}

/**
 * Map one finding's axe tags to criteria and the frameworks that reference
 * them. `best-practice` rules carry no criterion — they are good hygiene, not
 * a requirement, and are reported as such rather than being dropped.
 */
export function mapIssueTags(tags: readonly string[]): IssueFrameworkMapping {
  const criteria = criteriaFromAxeTags(tags).map(mapCriterion);
  const frameworks = new Set<FrameworkId>();
  for (const mapping of criteria) {
    for (const id of mapping.frameworks) frameworks.add(id);
  }
  return {
    criteria,
    frameworks: Array.from(frameworks),
    bestPracticeOnly: criteria.length === 0,
  };
}

export interface FrameworkCoverage {
  framework: Framework;
  /** Distinct criteria with at least one finding. */
  affectedCriteria: string[];
  /** Findings that map to this framework. */
  findings: number;
}

export interface ComplianceSummary {
  coverage: FrameworkCoverage[];
  /** Criteria hit at least once, in criterion order. */
  affectedCriteria: CriterionMapping[];
  /** Findings that map to no success criterion (best-practice rules). */
  bestPracticeFindings: number;
  totalFindings: number;
}

/**
 * Roll findings up per framework for the report's compliance section.
 *
 * Counts findings and criteria — never a pass rate. A scan cannot establish
 * conformance with any of these instruments; it can only show which
 * referenced criteria currently have detected problems.
 */
export function summarizeCompliance(
  issues: ReadonlyArray<{ wcagTags?: readonly string[] }>
): ComplianceSummary {
  const findingsByFramework = new Map<FrameworkId, number>();
  const criteriaByFramework = new Map<FrameworkId, Set<string>>();
  const affected = new Map<string, CriterionMapping>();
  let bestPracticeFindings = 0;

  for (const issue of issues) {
    const mapping = mapIssueTags(issue.wcagTags ?? []);
    if (mapping.bestPracticeOnly) {
      bestPracticeFindings += 1;
      continue;
    }
    for (const criterionMapping of mapping.criteria) {
      affected.set(criterionMapping.criterion.num, criterionMapping);
    }
    for (const id of mapping.frameworks) {
      findingsByFramework.set(id, (findingsByFramework.get(id) ?? 0) + 1);
      const set = criteriaByFramework.get(id) ?? new Set<string>();
      for (const criterionMapping of mapping.criteria) {
        if (criterionMapping.frameworks.includes(id)) {
          set.add(criterionMapping.criterion.num);
        }
      }
      criteriaByFramework.set(id, set);
    }
  }

  const coverage: FrameworkCoverage[] = Object.values(FRAMEWORKS)
    .map((framework) => ({
      framework,
      findings: findingsByFramework.get(framework.id) ?? 0,
      affectedCriteria: Array.from(criteriaByFramework.get(framework.id) ?? []).sort(
        (a, b) =>
          compareCriteria(
            { num: a, name: "", level: "A", since: "2.0" },
            { num: b, name: "", level: "A", since: "2.0" }
          )
      ),
    }))
    .sort((a, b) => b.findings - a.findings);

  return {
    coverage,
    affectedCriteria: Array.from(affected.values()).sort((a, b) =>
      compareCriteria(a.criterion, b.criterion)
    ),
    bestPracticeFindings,
    totalFindings: issues.length,
  };
}

/** Criteria a framework references but automation cannot decide on its own. */
export const AUTOMATION_BLIND_SPOTS: readonly string[] = [
  "1.2.1",
  "1.2.2",
  "1.2.3",
  "1.2.4",
  "1.2.5",
  "1.3.2",
  "1.3.3",
  "1.4.5",
  "2.1.1",
  "2.1.2",
  "2.4.3",
  "2.4.5",
  "2.4.6",
  "2.5.1",
  "2.5.7",
  "3.2.3",
  "3.2.4",
  "3.3.3",
  "3.3.4",
  "3.3.8",
];

/**
 * The A/AA criteria in scope for a framework, split into what the scan can
 * evidence and what still needs a person. Used by the report to state scope
 * honestly instead of implying full coverage.
 */
export function frameworkScope(id: FrameworkId): {
  total: number;
  manualOnly: number;
} {
  const inScope = WCAG_CRITERIA.filter((criterion) =>
    frameworksForCriterion(criterion).includes(id)
  );
  return {
    total: inScope.length,
    manualOnly: inScope.filter((criterion) => AUTOMATION_BLIND_SPOTS.includes(criterion.num))
      .length,
  };
}
