export interface WcagCriterion {
  id: string;
  level: "A" | "AA" | "AAA";
  title: string;
  short: string;
}

export const WCAG_22: WcagCriterion[] = [
  { id: "1.1.1", level: "A", title: "Non-text Content", short: "All non-text content has a text alternative." },
  { id: "1.3.1", level: "A", title: "Info and Relationships", short: "Structure and relationships exposed programmatically." },
  { id: "1.4.3", level: "AA", title: "Contrast (Minimum)", short: "Text contrast at least 4.5:1." },
  { id: "1.4.10", level: "AA", title: "Reflow", short: "Content reflows without 2D scrolling at 320 CSS px." },
  { id: "1.4.11", level: "AA", title: "Non-text Contrast", short: "UI components and graphical objects have 3:1 contrast." },
  { id: "2.1.1", level: "A", title: "Keyboard", short: "All functionality available from a keyboard." },
  { id: "2.2.2", level: "A", title: "Pause, Stop, Hide", short: "Provide controls for moving content longer than 5 seconds." },
  { id: "2.4.2", level: "A", title: "Page Titled", short: "Pages have titles describing topic or purpose." },
  { id: "2.4.4", level: "A", title: "Link Purpose (In Context)", short: "Purpose of each link determinable from the link text and context." },
  { id: "2.4.7", level: "AA", title: "Focus Visible", short: "Keyboard focus is visible." },
  { id: "2.4.11", level: "AA", title: "Focus Not Obscured (Minimum)", short: "Focused component is not entirely hidden by content." },
  { id: "2.5.8", level: "AA", title: "Target Size (Minimum)", short: "Pointer targets are at least 24×24 CSS px." },
  { id: "3.1.1", level: "A", title: "Language of Page", short: "Primary language of the page is programmatically determinable." },
  { id: "3.3.1", level: "A", title: "Error Identification", short: "Errors are identified and described in text." },
  { id: "3.3.2", level: "A", title: "Labels or Instructions", short: "Labels or instructions provided where input is required." },
  { id: "4.1.2", level: "A", title: "Name, Role, Value", short: "All UI components expose name, role, and value to assistive tech." },
  { id: "4.1.3", level: "AA", title: "Status Messages", short: "Status messages programmatically determinable without focus." },
];

export function getCriterion(id: string): WcagCriterion | undefined {
  return WCAG_22.find((c) => id.startsWith(c.id));
}
