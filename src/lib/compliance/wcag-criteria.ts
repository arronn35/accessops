/**
 * WCAG success criteria, Level A and AA, versions 2.0 → 2.2.
 *
 * Only A/AA are listed: those are the levels every framework this product
 * reports against actually references. AAA criteria exist but no regulation
 * below requires them, so claiming them would overstate the scan.
 *
 * `since` is the WCAG version that introduced the criterion — it is what
 * decides whether a finding falls under a given law, because each regulation
 * freezes a specific WCAG version (see ./frameworks).
 */
export type WcagLevel = "A" | "AA";
export type WcagVersion = "2.0" | "2.1" | "2.2";

export interface WcagCriterion {
  /** Dotted number, e.g. "1.4.3". */
  num: string;
  name: string;
  level: WcagLevel;
  since: WcagVersion;
  /** Obsoleted in a later version (4.1.1 was removed in WCAG 2.2). */
  removedIn?: WcagVersion;
}

export const WCAG_CRITERIA: readonly WcagCriterion[] = [
  // ---- WCAG 2.0 ----
  { num: "1.1.1", name: "Non-text Content", level: "A", since: "2.0" },
  { num: "1.2.1", name: "Audio-only and Video-only (Prerecorded)", level: "A", since: "2.0" },
  { num: "1.2.2", name: "Captions (Prerecorded)", level: "A", since: "2.0" },
  { num: "1.2.3", name: "Audio Description or Media Alternative (Prerecorded)", level: "A", since: "2.0" },
  { num: "1.2.4", name: "Captions (Live)", level: "AA", since: "2.0" },
  { num: "1.2.5", name: "Audio Description (Prerecorded)", level: "AA", since: "2.0" },
  { num: "1.3.1", name: "Info and Relationships", level: "A", since: "2.0" },
  { num: "1.3.2", name: "Meaningful Sequence", level: "A", since: "2.0" },
  { num: "1.3.3", name: "Sensory Characteristics", level: "A", since: "2.0" },
  { num: "1.4.1", name: "Use of Color", level: "A", since: "2.0" },
  { num: "1.4.2", name: "Audio Control", level: "A", since: "2.0" },
  { num: "1.4.3", name: "Contrast (Minimum)", level: "AA", since: "2.0" },
  { num: "1.4.4", name: "Resize Text", level: "AA", since: "2.0" },
  { num: "1.4.5", name: "Images of Text", level: "AA", since: "2.0" },
  { num: "2.1.1", name: "Keyboard", level: "A", since: "2.0" },
  { num: "2.1.2", name: "No Keyboard Trap", level: "A", since: "2.0" },
  { num: "2.2.1", name: "Timing Adjustable", level: "A", since: "2.0" },
  { num: "2.2.2", name: "Pause, Stop, Hide", level: "A", since: "2.0" },
  { num: "2.3.1", name: "Three Flashes or Below Threshold", level: "A", since: "2.0" },
  { num: "2.4.1", name: "Bypass Blocks", level: "A", since: "2.0" },
  { num: "2.4.2", name: "Page Titled", level: "A", since: "2.0" },
  { num: "2.4.3", name: "Focus Order", level: "A", since: "2.0" },
  { num: "2.4.4", name: "Link Purpose (In Context)", level: "A", since: "2.0" },
  { num: "2.4.5", name: "Multiple Ways", level: "AA", since: "2.0" },
  { num: "2.4.6", name: "Headings and Labels", level: "AA", since: "2.0" },
  { num: "2.4.7", name: "Focus Visible", level: "AA", since: "2.0" },
  { num: "3.1.1", name: "Language of Page", level: "A", since: "2.0" },
  { num: "3.1.2", name: "Language of Parts", level: "AA", since: "2.0" },
  { num: "3.2.1", name: "On Focus", level: "A", since: "2.0" },
  { num: "3.2.2", name: "On Input", level: "A", since: "2.0" },
  { num: "3.2.3", name: "Consistent Navigation", level: "AA", since: "2.0" },
  { num: "3.2.4", name: "Consistent Identification", level: "AA", since: "2.0" },
  { num: "3.3.1", name: "Error Identification", level: "A", since: "2.0" },
  { num: "3.3.2", name: "Labels or Instructions", level: "A", since: "2.0" },
  { num: "3.3.3", name: "Error Suggestion", level: "AA", since: "2.0" },
  { num: "3.3.4", name: "Error Prevention (Legal, Financial, Data)", level: "AA", since: "2.0" },
  // Obsoleted in WCAG 2.2; axe still reports rules tagged with it.
  { num: "4.1.1", name: "Parsing", level: "A", since: "2.0", removedIn: "2.2" },
  { num: "4.1.2", name: "Name, Role, Value", level: "A", since: "2.0" },

  // ---- WCAG 2.1 additions ----
  { num: "1.3.4", name: "Orientation", level: "AA", since: "2.1" },
  { num: "1.3.5", name: "Identify Input Purpose", level: "AA", since: "2.1" },
  { num: "1.4.10", name: "Reflow", level: "AA", since: "2.1" },
  { num: "1.4.11", name: "Non-text Contrast", level: "AA", since: "2.1" },
  { num: "1.4.12", name: "Text Spacing", level: "AA", since: "2.1" },
  { num: "1.4.13", name: "Content on Hover or Focus", level: "AA", since: "2.1" },
  { num: "2.1.4", name: "Character Key Shortcuts", level: "A", since: "2.1" },
  { num: "2.5.1", name: "Pointer Gestures", level: "A", since: "2.1" },
  { num: "2.5.2", name: "Pointer Cancellation", level: "A", since: "2.1" },
  { num: "2.5.3", name: "Label in Name", level: "A", since: "2.1" },
  { num: "2.5.4", name: "Motion Actuation", level: "A", since: "2.1" },
  { num: "4.1.3", name: "Status Messages", level: "AA", since: "2.1" },

  // ---- WCAG 2.2 additions ----
  { num: "2.4.11", name: "Focus Not Obscured (Minimum)", level: "AA", since: "2.2" },
  { num: "2.5.7", name: "Dragging Movements", level: "AA", since: "2.2" },
  { num: "2.5.8", name: "Target Size (Minimum)", level: "AA", since: "2.2" },
  { num: "3.2.6", name: "Consistent Help", level: "A", since: "2.2" },
  { num: "3.3.7", name: "Redundant Entry", level: "A", since: "2.2" },
  { num: "3.3.8", name: "Accessible Authentication (Minimum)", level: "AA", since: "2.2" },
] as const;

const BY_NUM = new Map(WCAG_CRITERIA.map((criterion) => [criterion.num, criterion]));

export function wcagCriterion(num: string): WcagCriterion | null {
  return BY_NUM.get(num) ?? null;
}

/**
 * Turn axe-core tags into success-criterion numbers.
 *
 * axe tags a rule with `wcag111` (= 1.1.1) and `wcag1410` (= 1.4.10). The
 * digits are ambiguous without the criteria table: "wcag1410" could read as
 * 1.4.10 or 14.1.0, so candidates are resolved against known criteria.
 */
export function criteriaFromAxeTags(tags: readonly string[]): WcagCriterion[] {
  const found = new Map<string, WcagCriterion>();
  for (const tag of tags) {
    const digits = /^wcag(\d{3,4})$/.exec(tag)?.[1];
    if (!digits) continue;
    // principle.guideline.criterion — the criterion part may be two digits.
    const candidates =
      digits.length === 3
        ? [`${digits[0]}.${digits[1]}.${digits[2]}`]
        : [
            `${digits[0]}.${digits[1]}.${digits.slice(2)}`,
            `${digits[0]}.${digits.slice(1, 3)}.${digits[3]}`,
          ];
    for (const candidate of candidates) {
      const criterion = BY_NUM.get(candidate);
      if (criterion) {
        found.set(criterion.num, criterion);
        break;
      }
    }
  }
  return Array.from(found.values()).sort(compareCriteria);
}

export function compareCriteria(a: WcagCriterion, b: WcagCriterion): number {
  const pa = a.num.split(".").map(Number);
  const pb = b.num.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}
