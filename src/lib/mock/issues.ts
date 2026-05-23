import type { Severity } from "@/components/scan/SeverityBadge";

export type IssueCategory =
  | "contrast"
  | "alt-text"
  | "form-labels"
  | "button-names"
  | "link-names"
  | "heading-structure"
  | "aria"
  | "keyboard"
  | "focus-visibility"
  | "landmarks"
  | "language"
  | "document-title";

export type IssueStatus = "to_review" | "planned" | "in_progress" | "needs_human_review" | "fixed" | "accepted_risk";

export interface Issue {
  id: string;
  title: string;
  severity: Severity;
  category: IssueCategory;
  page: string;
  pageTitle: string;
  element: string; // CSS selector
  wcag: { criterion: string; level: "A" | "AA" | "AAA"; version: "2.2" | "2.1" };
  whyMatters: string;
  whoAffects: string[];
  howToFix: string;
  before: { language: string; code: string };
  after: { language: string; code: string };
  aiExplanation: string;
  humanReviewRequired: boolean;
  status: IssueStatus;
  assigneeId?: string;
  manualChecks: string[];
}

export const CATEGORY_META: Record<IssueCategory, { label: string; description: string }> = {
  "contrast": { label: "Contrast", description: "Text or UI components do not meet minimum color contrast." },
  "alt-text": { label: "Missing alt text", description: "Images without descriptive alternative text." },
  "form-labels": { label: "Form labels", description: "Form inputs without programmatically associated labels." },
  "button-names": { label: "Button names", description: "Buttons missing accessible names." },
  "link-names": { label: "Link names", description: "Links with no discernible name or generic text." },
  "heading-structure": { label: "Heading structure", description: "Skipped heading levels or missing h1." },
  "aria": { label: "ARIA issues", description: "Incorrect, redundant, or unsupported ARIA usage." },
  "keyboard": { label: "Keyboard navigation", description: "Functionality unavailable to keyboard-only users." },
  "focus-visibility": { label: "Focus visibility", description: "Focused elements have no visible focus indicator." },
  "landmarks": { label: "Landmark structure", description: "Missing or duplicate landmark regions." },
  "language": { label: "Language attribute", description: "Page or content missing a language declaration." },
  "document-title": { label: "Document title", description: "Page title missing or non-descriptive." },
};

export const issues: Issue[] = [
  {
    id: "is_001",
    title: "“Add to cart” button has no accessible name",
    severity: "critical",
    category: "button-names",
    page: "/products/copper-french-press",
    pageTitle: "Copper French Press — Product detail",
    element: "button.btn-cart-icon",
    wcag: { criterion: "4.1.2 Name, Role, Value", level: "A", version: "2.2" },
    whyMatters:
      "Screen reader users hear only “button” without context. They cannot tell what action this control performs and may skip purchase entirely.",
    whoAffects: [
      "Screen reader users (NVDA, JAWS, VoiceOver)",
      "Voice-control users who must speak the button name",
    ],
    howToFix:
      "Add a visible text label, or if the design requires an icon-only button, supply an aria-label that matches the visible purpose.",
    before: {
      language: "tsx",
      code: `<button className="btn-cart-icon" onClick={addToCart}>
  <CartIcon />
</button>`,
    },
    after: {
      language: "tsx",
      code: `<button
  className="btn-cart-icon"
  aria-label="Add Copper French Press to cart"
  onClick={addToCart}
>
  <CartIcon aria-hidden />
</button>`,
    },
    aiExplanation:
      "The icon button on the product detail page has no text node and no aria-label, so assistive technology has nothing to announce. An aria-label that names the specific product makes the control self-describing and works well with voice control software.",
    humanReviewRequired: false,
    status: "to_review",
    manualChecks: [
      "Tab to the button with keyboard, then activate VoiceOver — confirm it announces the product name and the word “button”.",
      "Verify the icon has aria-hidden so it isn’t doubly announced.",
    ],
  },
  {
    id: "is_002",
    title: "Product price has 3.8:1 contrast on hero card",
    severity: "critical",
    category: "contrast",
    page: "/products/copper-french-press",
    pageTitle: "Copper French Press — Product detail",
    element: ".product-hero .price",
    wcag: { criterion: "1.4.3 Contrast (Minimum)", level: "AA", version: "2.2" },
    whyMatters:
      "At 3.8:1 the price text fails WCAG AA (4.5:1 minimum). Low-vision users and users in bright environments may miss the price entirely.",
    whoAffects: [
      "Users with low vision",
      "Users in bright outdoor lighting",
      "Users with monochrome / aging displays",
    ],
    howToFix: "Use a darker text color (≥ 4.5:1 against the background) or switch to a lighter background.",
    before: {
      language: "css",
      code: `.product-hero .price {
  color: #8C8C8C;      /* 3.8:1 on #FFFFFF */
  background: #FFFFFF;
  font-size: 22px;
}`,
    },
    after: {
      language: "css",
      code: `.product-hero .price {
  color: #4B5570;      /* 7.1:1 on #FFFFFF */
  background: #FFFFFF;
  font-size: 22px;
}`,
    },
    aiExplanation:
      "The grey #8C8C8C used for the price color resolves to a contrast ratio of 3.8 against the white card background. WCAG 2.2 AA requires 4.5:1 for normal text. Switching to a darker neutral such as #4B5570 brings the ratio to 7.1:1 while staying neutral and on-brand.",
    humanReviewRequired: false,
    status: "in_progress",
    assigneeId: "u3",
    manualChecks: [
      "Verify with a contrast checker against the actual card background color (not the page background).",
      "Check hover/focus states still meet 4.5:1.",
    ],
  },
  {
    id: "is_003",
    title: "Product images on category page have empty alt attributes",
    severity: "critical",
    category: "alt-text",
    page: "/collections/coffee",
    pageTitle: "Coffee — Collection page",
    element: ".product-card img",
    wcag: { criterion: "1.1.1 Non-text Content", level: "A", version: "2.2" },
    whyMatters:
      "Screen reader users see only a list of unnamed images. Without alt text they cannot tell which product is which until they reach the product title — assuming it is also focusable.",
    whoAffects: ["Blind and low-vision users", "Users on slow connections where images fail to load"],
    howToFix:
      "Set descriptive alt text on each product image. The alt should describe the product, not the file name.",
    before: {
      language: "html",
      code: `<img src="/img/french-press.jpg" alt="" class="product-card__image" />`,
    },
    after: {
      language: "html",
      code: `<img
  src="/img/french-press.jpg"
  alt="Copper French Press, 8-cup capacity"
  class="product-card__image"
/>`,
    },
    aiExplanation:
      "Decorative images can keep alt=\"\", but these are the only visual identifier of each product in the listing. Descriptive alt text built from the product name and a short attribute is appropriate.",
    humanReviewRequired: false,
    status: "to_review",
    manualChecks: [
      "Confirm alt text reflects what a sighted user sees, not internal SKUs.",
      "Verify alt updates dynamically when product variants change.",
    ],
  },
  {
    id: "is_004",
    title: "Email field on checkout has no associated label",
    severity: "critical",
    category: "form-labels",
    page: "/checkout",
    pageTitle: "Checkout",
    element: "input[type=email]#email",
    wcag: { criterion: "3.3.2 Labels or Instructions", level: "A", version: "2.2" },
    whyMatters:
      "Screen reader users hear only “edit text” when this field is focused. Voice-control users cannot say “click email” to focus it. Placeholder text disappears when typing, leaving no persistent label.",
    whoAffects: [
      "Screen reader users",
      "Users with cognitive disabilities who need persistent labels",
      "Voice-control users",
    ],
    howToFix: "Add a visible <label> element with a for attribute matching the input id, or wrap the input in a label.",
    before: {
      language: "html",
      code: `<input
  id="email"
  type="email"
  placeholder="Email address"
  required
/>`,
    },
    after: {
      language: "html",
      code: `<label for="email" class="form-label">Email address</label>
<input
  id="email"
  type="email"
  autocomplete="email"
  required
/>`,
    },
    aiExplanation:
      "Placeholders are not labels. The browser exposes a programmatic label only when a <label> element is associated with the input via the for/id pair, or when the input is wrapped inside the label. Adding autocomplete=\"email\" also benefits users with cognitive disabilities.",
    humanReviewRequired: false,
    status: "planned",
    assigneeId: "u3",
    manualChecks: [
      "Tab to field and confirm screen reader announces “Email address, edit text, required”.",
      "Confirm label remains visible when field is filled.",
    ],
  },
  {
    id: "is_005",
    title: "Mobile menu cannot be closed using the keyboard",
    severity: "critical",
    category: "keyboard",
    page: "/",
    pageTitle: "Home",
    element: "button.menu-close",
    wcag: { criterion: "2.1.1 Keyboard", level: "A", version: "2.2" },
    whyMatters:
      "Once the mobile menu opens via keyboard, the close button is never reachable by Tab and Escape does not dismiss the panel. Keyboard users are trapped.",
    whoAffects: ["Keyboard-only users", "Switch-device users", "Screen reader users on touch devices using TalkBack/VoiceOver"],
    howToFix:
      "Restore focus to the close button when the menu opens, support Escape to dismiss, and ensure focus returns to the menu trigger after closing.",
    before: {
      language: "tsx",
      code: `function MobileMenu({ open, onClose }) {
  return open ? (
    <div className="mobile-menu">
      <button className="menu-close" onClick={onClose}>×</button>
      {/* links */}
    </div>
  ) : null;
}`,
    },
    after: {
      language: "tsx",
      code: `function MobileMenu({ open, onClose, triggerRef }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); triggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Site menu" className="mobile-menu">
      <button ref={closeRef} className="menu-close" aria-label="Close menu" onClick={() => { onClose(); triggerRef.current?.focus(); }}>×</button>
      {/* links */}
    </div>
  );
}`,
    },
    aiExplanation:
      "The original component renders inline and never moves focus. The fix promotes the menu to a dialog with focus management: focus moves into the panel on open, Escape closes it, and focus returns to the trigger on close. Without this pattern, keyboard users get stranded outside the visible content.",
    humanReviewRequired: true,
    status: "needs_human_review",
    assigneeId: "u4",
    manualChecks: [
      "Open menu with keyboard, press Escape, verify focus returns to the trigger.",
      "Verify Tab stays inside the menu while open (focus trap).",
      "Verify visible focus ring on the close button.",
    ],
  },
  {
    id: "is_006",
    title: "Heading levels skip from h1 to h4 on the homepage",
    severity: "moderate",
    category: "heading-structure",
    page: "/",
    pageTitle: "Home",
    element: ".hero + .featured-products h4",
    wcag: { criterion: "1.3.1 Info and Relationships", level: "A", version: "2.2" },
    whyMatters:
      "Screen readers expose a heading outline that helps users navigate the page. Skipping levels makes the outline confusing and can hide major sections.",
    whoAffects: ["Screen reader users navigating by heading", "Users relying on reader-mode tools"],
    howToFix: "Use h2 for the section heading after the hero h1, and reserve h4 for nested subsections.",
    before: { language: "html", code: `<h1>Welcome to Northwind Shop</h1>\n<h4>Featured products</h4>` },
    after: { language: "html", code: `<h1>Welcome to Northwind Shop</h1>\n<h2>Featured products</h2>` },
    aiExplanation:
      "The 'Featured products' section starts a new top-level section under the hero, so it should be h2. Skipping to h4 here is purely stylistic — restyle the h2 to match the smaller visual treatment with CSS.",
    humanReviewRequired: false,
    status: "to_review",
    manualChecks: ["Run heading outline check (e.g., HeadingsMap)."],
  },
  {
    id: "is_007",
    title: "“Read more” links lack unique discernible text",
    severity: "moderate",
    category: "link-names",
    page: "/blog",
    pageTitle: "Blog index",
    element: ".post-card a.read-more",
    wcag: { criterion: "2.4.4 Link Purpose (In Context)", level: "A", version: "2.2" },
    whyMatters:
      "Screen reader users frequently pull up a list of links; a list of identical “Read more” links forces them to context-switch back to each card to know where each one goes.",
    whoAffects: ["Screen reader users", "Voice-control users"],
    howToFix:
      "Either replace 'Read more' with descriptive text per card, or supply an aria-label that includes the post title.",
    before: {
      language: "html",
      code: `<a href="/blog/single-origin-coffee" class="read-more">Read more</a>`,
    },
    after: {
      language: "html",
      code: `<a
  href="/blog/single-origin-coffee"
  class="read-more"
  aria-label="Read more: Why single-origin coffee tastes better"
>
  Read more
</a>`,
    },
    aiExplanation:
      "Keeping 'Read more' visually but adding a context-rich aria-label preserves the design and gives assistive tech a unique, descriptive name per link.",
    humanReviewRequired: false,
    status: "planned",
    assigneeId: "u3",
    manualChecks: ["Verify visible 'Read more' is still focusable and the aria-label fully replaces the accessible name."],
  },
  {
    id: "is_008",
    title: "Custom dropdown uses role=\"button\" but expands without aria-expanded",
    severity: "moderate",
    category: "aria",
    page: "/account",
    pageTitle: "Account dashboard",
    element: ".account-menu-trigger",
    wcag: { criterion: "4.1.2 Name, Role, Value", level: "A", version: "2.2" },
    whyMatters:
      "Without aria-expanded, assistive tech cannot tell users whether the menu is open or closed. They may attempt to open an already-open menu repeatedly.",
    whoAffects: ["Screen reader users", "Users with cognitive disabilities benefiting from clear state"],
    howToFix: "Add aria-expanded that toggles between true and false, and aria-controls pointing to the menu id.",
    before: {
      language: "tsx",
      code: `<div role="button" tabIndex={0} onClick={toggle}>Account ▾</div>`,
    },
    after: {
      language: "tsx",
      code: `<button
  type="button"
  aria-expanded={open}
  aria-controls="account-menu"
  onClick={toggle}
>
  Account ▾
</button>
<ul id="account-menu" hidden={!open}>{/* items */}</ul>`,
    },
    aiExplanation:
      "Prefer a real <button> over role=\"button\" — it gets keyboard handling and disabled state for free. aria-expanded communicates the open/closed state, and aria-controls links the trigger to its menu.",
    humanReviewRequired: false,
    status: "to_review",
    manualChecks: ["Toggle menu, verify accessibility tree shows aria-expanded toggling."],
  },
  {
    id: "is_009",
    title: "Focus indicator removed globally with outline: 0",
    severity: "moderate",
    category: "focus-visibility",
    page: "(site-wide)",
    pageTitle: "Sitewide CSS",
    element: "global stylesheet",
    wcag: { criterion: "2.4.7 Focus Visible", level: "AA", version: "2.2" },
    whyMatters:
      "With no visible focus indicator, sighted keyboard users cannot tell which element will receive their next interaction. This is one of the most common failure points for keyboard usability.",
    whoAffects: [
      "Sighted keyboard users",
      "Switch-device users",
      "Users with motor disabilities",
      "Anyone temporarily relying on keyboard (broken trackpad, etc.)",
    ],
    howToFix:
      "Remove the outline: 0 reset, or replace it with a custom :focus-visible style that meets contrast and is at least 2px thick.",
    before: { language: "css", code: `*:focus { outline: 0; }` },
    after: {
      language: "css",
      code: `*:focus { outline: none; }
*:focus-visible {
  outline: 2px solid #4A7BFF;
  outline-offset: 2px;
  border-radius: 4px;
}`,
    },
    aiExplanation:
      "Using :focus-visible scopes the indicator to keyboard focus (and not mouse-click focus), preserving the design intent while keeping the accessibility benefit.",
    humanReviewRequired: false,
    status: "fixed",
    assigneeId: "u3",
    manualChecks: ["Tab through every focusable element — confirm an indicator is visible against all backgrounds."],
  },
  {
    id: "is_010",
    title: "Main content not wrapped in a <main> landmark",
    severity: "moderate",
    category: "landmarks",
    page: "/",
    pageTitle: "Home",
    element: "body > div.app-root",
    wcag: { criterion: "1.3.1 Info and Relationships", level: "A", version: "2.2" },
    whyMatters:
      "Screen reader users navigate via landmarks (main, nav, banner, contentinfo). Without a <main>, the “skip to content” pattern and rotor navigation are broken.",
    whoAffects: ["Screen reader users navigating by landmark"],
    howToFix: "Wrap the primary content area in a <main> element with a unique label.",
    before: { language: "html", code: `<body>\n  <div class="app-root">{/* content */}</div>\n</body>` },
    after: {
      language: "html",
      code: `<body>\n  <header>{/* nav */}</header>\n  <main id="main" tabindex="-1">{/* content */}</main>\n  <footer>{/* footer */}</footer>\n</body>`,
    },
    aiExplanation:
      "Adding <main> with id=\"main\" makes the page compatible with a 'skip to content' link and improves landmark navigation across all screen readers.",
    humanReviewRequired: false,
    status: "fixed",
    manualChecks: ["Test 'skip to content' with keyboard — must focus and announce the main region."],
  },
  {
    id: "is_011",
    title: "Page language not declared on <html>",
    severity: "moderate",
    category: "language",
    page: "(site-wide)",
    pageTitle: "Sitewide",
    element: "html",
    wcag: { criterion: "3.1.1 Language of Page", level: "A", version: "2.2" },
    whyMatters:
      "Screen readers pick the wrong voice/pronunciation when the language isn’t declared, leading to unintelligible output.",
    whoAffects: ["Screen reader users", "Users of automatic translation"],
    howToFix: "Add a lang attribute on the root <html> element matching the page’s primary language.",
    before: { language: "html", code: `<html>` },
    after: { language: "html", code: `<html lang="en">` },
    aiExplanation:
      "A single attribute. Add lang=\"en\" (or the correct BCP 47 code) on <html>, and use lang on subtree elements when content switches languages within the page.",
    humanReviewRequired: false,
    status: "fixed",
    manualChecks: ["View source — confirm lang attribute is present."],
  },
  {
    id: "is_012",
    title: "Document title is generic (“Home”) on every page",
    severity: "minor",
    category: "document-title",
    page: "(multi-page)",
    pageTitle: "Multiple pages",
    element: "<title>",
    wcag: { criterion: "2.4.2 Page Titled", level: "A", version: "2.2" },
    whyMatters:
      "Users opening multiple tabs cannot distinguish them. Screen readers announce the title on page load, so identical titles make navigation confusing.",
    whoAffects: ["All users with multiple tabs", "Screen reader users"],
    howToFix: "Set a unique, descriptive title per page (e.g., 'Coffee — Northwind Shop').",
    before: { language: "html", code: `<title>Home</title>` },
    after: { language: "html", code: `<title>Coffee collection — Northwind Shop</title>` },
    aiExplanation:
      "In Next.js, set metadata.title per route or use a title template in the root layout so titles always include the site name and the page-specific context.",
    humanReviewRequired: false,
    status: "planned",
    manualChecks: ["Browse 3–4 routes and verify each tab has a distinct title."],
  },
  {
    id: "is_013",
    title: "Search results announce results only visually, not to screen readers",
    severity: "minor",
    category: "aria",
    page: "/search",
    pageTitle: "Search",
    element: ".search-results-count",
    wcag: { criterion: "4.1.3 Status Messages", level: "AA", version: "2.2" },
    whyMatters:
      "When the result count updates without a live region, screen reader users have no audible confirmation that their query returned results.",
    whoAffects: ["Screen reader users on dynamic pages"],
    howToFix: "Add aria-live=\"polite\" to the result count container, or use role=\"status\".",
    before: { language: "html", code: `<p class="search-results-count">23 results</p>` },
    after: {
      language: "html",
      code: `<p class="search-results-count" role="status" aria-live="polite">\n  23 results\n</p>`,
    },
    aiExplanation:
      "Use role=\"status\" or aria-live=\"polite\" so the new count is announced after typing. Avoid aria-live=\"assertive\" for non-critical updates — it interrupts the user.",
    humanReviewRequired: false,
    status: "to_review",
    manualChecks: ["Type into search and listen with VoiceOver — count update should be announced."],
  },
  {
    id: "is_014",
    title: "Newsletter signup error not associated with the email field",
    severity: "minor",
    category: "form-labels",
    page: "(site-wide footer)",
    pageTitle: "Footer newsletter widget",
    element: ".newsletter-form #email",
    wcag: { criterion: "3.3.1 Error Identification", level: "A", version: "2.2" },
    whyMatters:
      "The error appears visually below the field but isn’t programmatically linked. Screen reader users cannot tell which field is invalid.",
    whoAffects: ["Screen reader users", "Users with cognitive disabilities"],
    howToFix: "Use aria-describedby pointing to the error element id, and aria-invalid=\"true\".",
    before: {
      language: "html",
      code: `<input type="email" id="email" />\n<span class="error">Please enter a valid email.</span>`,
    },
    after: {
      language: "html",
      code: `<input
  type="email"
  id="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<span id="email-error" class="error">Please enter a valid email.</span>`,
    },
    aiExplanation:
      "Linking the error message via aria-describedby is the standard pattern. Pair with aria-invalid=\"true\" so the field is announced as invalid the moment focus enters it.",
    humanReviewRequired: false,
    status: "to_review",
    manualChecks: ["Submit invalid email — focus should move to the field and announce the error."],
  },
  {
    id: "is_015",
    title: "Animated marquee scrolls without a pause control",
    severity: "minor",
    category: "keyboard",
    page: "/",
    pageTitle: "Home",
    element: ".announcement-marquee",
    wcag: { criterion: "2.2.2 Pause, Stop, Hide", level: "A", version: "2.2" },
    whyMatters:
      "Auto-scrolling content can distract users with cognitive disabilities and trigger discomfort for users with vestibular conditions. A pause control is required when motion exceeds 5 seconds.",
    whoAffects: ["Users with cognitive disabilities", "Users with vestibular disorders", "Users with low vision who need time to read"],
    howToFix: "Provide a pause/play button, respect prefers-reduced-motion, and avoid auto-resume.",
    before: {
      language: "tsx",
      code: `<div className="announcement-marquee">
  <div className="marquee-track">{/* items */}</div>
</div>`,
    },
    after: {
      language: "tsx",
      code: `const [paused, setPaused] = useState(prefersReducedMotion);
return (
  <div className="announcement-marquee">
    <button
      onClick={() => setPaused((p) => !p)}
      aria-label={paused ? "Resume announcements" : "Pause announcements"}
    >
      {paused ? <Play /> : <Pause />}
    </button>
    <div className="marquee-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
      {/* items */}
    </div>
  </div>
);`,
    },
    aiExplanation:
      "WCAG 2.2.2 requires a pause/stop/hide mechanism for motion lasting longer than 5 seconds. Initialize the paused state from prefers-reduced-motion so users with that preference get the calmer default.",
    humanReviewRequired: true,
    status: "to_review",
    manualChecks: [
      "Verify pause button is focusable and labeled correctly.",
      "Verify prefers-reduced-motion preference starts the marquee paused.",
    ],
  },
];

export function getIssuesByScan(scanId: string): Issue[] {
  // For the prototype all issues belong to the latest scan.
  if (scanId === "sc_2025_05_12") return issues;
  return issues.slice(0, 6);
}

export function getIssue(id: string): Issue | undefined {
  return issues.find((i) => i.id === id);
}
