/**
 * The guided manual-audit checks.
 *
 * Shared between the reviewer UI and the report renderer so the two cannot
 * drift: a report that cites "keyboard walkthrough: passed" must mean the same
 * check the reviewer actually ticked, mapped to the same success criteria.
 *
 * Automated tooling cannot decide any of these, which is exactly why the
 * result has to be attributable to a person and stored server-side rather than
 * living in one browser's localStorage.
 */
export interface ManualCheckDefinition {
  id: string;
  title: string;
  /** WCAG 2.2 success criteria this check speaks to. */
  wcagCriteria: string[];
}

export const MANUAL_CHECKS: ManualCheckDefinition[] = [
  {
    id: "keyboard",
    title: "Keyboard-only walkthrough",
    wcagCriteria: ["2.1.1", "2.1.2"],
  },
  {
    id: "screen-reader",
    title: "Screen reader pass",
    wcagCriteria: ["1.3.1", "4.1.2"],
  },
  {
    id: "zoom",
    title: "Zoom and reflow",
    wcagCriteria: ["1.4.4", "1.4.10"],
  },
  {
    id: "reduced-motion",
    title: "Reduced motion",
    wcagCriteria: ["2.3.3"],
  },
  {
    id: "focus-order",
    title: "Focus order and visibility",
    wcagCriteria: ["2.4.3", "2.4.7"],
  },
  {
    id: "link-text",
    title: "Link purpose in context",
    wcagCriteria: ["2.4.4"],
  },
  {
    id: "form-errors",
    title: "Form errors and suggestions",
    wcagCriteria: ["3.3.1", "3.3.3"],
  },
];

export const MANUAL_CHECK_IDS = MANUAL_CHECKS.map((c) => c.id);

export type ManualCheckStatus = "pending" | "passed" | "failed";

export function manualCheckById(id: string): ManualCheckDefinition | null {
  return MANUAL_CHECKS.find((c) => c.id === id) ?? null;
}
