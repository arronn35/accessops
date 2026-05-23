export const reportMock = {
  id: "rep_2025_05_17",
  client: "Northwind Shop",
  preparedFor: "Northwind Shop Ltd.",
  preparedBy: "Northwind Studios",
  scanId: "sc_2025_05_12",
  scanDate: "2026-05-17",
  pagesScanned: 47,
  score: 78,
  summary:
    "Northwind Shop’s storefront shows steady progress against WCAG 2.2 AA-oriented checks since the prior audit. The most impactful remaining risks center on icon-only controls without accessible names, low-contrast pricing on product detail pages, and a mobile menu pattern that traps keyboard focus. Once these are addressed, the next priority is consistent heading structure across category pages.",
  topRisks: [
    {
      title: "Icon-only cart and search buttons lack accessible names",
      impact: "Blocks screen reader and voice-control users from completing purchases.",
      wcag: "4.1.2 Name, Role, Value (A)",
    },
    {
      title: "Product pricing text fails contrast minimum",
      impact: "Low-vision users may miss pricing on the primary product card.",
      wcag: "1.4.3 Contrast (Minimum) (AA)",
    },
    {
      title: "Mobile menu cannot be dismissed via keyboard",
      impact: "Keyboard-only users are trapped inside the open menu.",
      wcag: "2.1.1 Keyboard (A)",
    },
  ],
  roadmap: [
    {
      phase: "Week 1",
      focus: "Critical blockers",
      items: ["Fix icon-button names sitewide", "Restore visible focus indicators", "Add lang attribute to <html>"],
    },
    {
      phase: "Week 2",
      focus: "Forms & navigation",
      items: ["Associate labels with all form fields", "Implement keyboard-dismissible mobile menu", "Wrap main content in <main> landmark"],
    },
    {
      phase: "Week 3",
      focus: "Content structure",
      items: ["Normalize heading levels across templates", "Provide pause control for marquee", "Set descriptive page titles"],
    },
    {
      phase: "Ongoing",
      focus: "Verification",
      items: ["Manual screen reader pass per release", "Quarterly multi-page scans", "Track new content for alt text coverage"],
    },
  ],
  reviewerChecklist: [
    "Keyboard-only walkthrough of primary user journeys",
    "Screen reader pass on home, product detail, checkout",
    "Mobile gesture and zoom test at 200% and 400%",
    "Reduced-motion preference verification",
    "Color/contrast manual sampling on dynamic states (hover, focus, error)",
  ],
};
