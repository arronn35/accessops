# maitrico AccessOps AI — Design system

## 1. Product design summary

**maitrico AccessOps AI** is a premium, privacy-first SaaS for accessibility operations. The product
must feel:

- **Calm.** Severity colors are desaturated, alerts are tonal not shouty.
- **Trustworthy.** Every AI surface declares itself. Disclaimers are short and consistent.
- **Technical when it matters.** Code blocks, WCAG references, and developer-friendly defaults are
  one click away — but never block non-technical buyers.
- **Premium.** Generous spacing, single-layer shadows, restrained accent use.

The product is the opposite of "one-click compliance overlays". The UI must reinforce that on
every screen.

---

## 2. Color palette

All tokens are CSS variables defined in `@theme` inside `src/app/globals.css`. They are consumed
through Tailwind v4 utility classes (e.g. `bg-canvas`, `text-ink-900`, `ring-line`).

### Brand & neutrals

| Token | Hex | Usage |
|---|---|---|
| `navy-900` | `#0B1220` | Primary dark surface, primary button, logo mark background |
| `navy-800` | `#111A2E` | Hover for navy-900 |
| `navy-700` | `#1A2542` | Active / pressed state on dark |
| `paper` | `#FFFFFF` | Cards, surfaces |
| `canvas` | `#F7F8FB` | Default app body background (off-white) |
| `canvas-2` | `#EFF2F8` | Inset surfaces, hover for ghost buttons |
| `ink-900` | `#0E1422` | Body text |
| `ink-700` | `#2A3247` | Headings on light, button text |
| `ink-600` | `#4B5570` | Secondary text |
| `ink-500` | `#6B7590` | Metadata, captions |
| `ink-400` | `#8892A6` | Disabled, decorative |
| `line` | `#E4E8F0` | Borders, dividers |
| `line-strong` | `#CDD3E0` | Form field borders |

### Accents

| Token | Hex | Usage |
|---|---|---|
| `blue-500` | `#4A7BFF` | Primary accent, focus ring, links |
| `blue-600` | `#3563E6` | Accent hover |
| `purple-500` | `#7A6CF0` | AI accent (icons, AI block, product chip) |
| `purple-600` | `#5E4FD9` | AI accent hover |
| `green-500` | `#3FA67A` | "Passed" / muted-positive |
| `amber-500` | `#C28A2E` | Moderate severity (desaturated) |
| `rose-500` | `#B7475A` | Critical severity (desaturated, never pure red) |

### Why severity colors are desaturated

The brief calls out "avoid aggressive warning-heavy design." Pure `#FF0000` reads as panic. Our
critical rose comes in at **5.1:1 on `--canvas`**, amber at **4.6:1**, green at **4.5:1** — all
WCAG AA. Communication is preserved without alarm.

### High-contrast mode

Toggling `<html data-contrast="high">` switches the entire token block to a stricter palette
(black on white, navy borders, blue at `#0033CC`, rose at `#8A1322`). Implemented in
`src/app/globals.css`.

---

## 3. Typography system

- **UI font:** Inter when available, with a system UI fallback stack. The app does not depend on Google Fonts during build.
- **Mono font:** JetBrains Mono when available, with a system mono fallback stack for code blocks and IDs/URLs.
- **Base size:** 16 px body, line-height 1.55.
- **User text size:** 90% / 100% / 115% via `<html data-text-size>` from the A11y settings panel.

### Scale

| Size | px | Use |
|---|---|---|
| `text-[10px]` | 10 | Reserved for kicker uppercase labels only, with tracking |
| `text-xs` | 12 | Metadata, captions, table headers |
| `text-sm` | 14 | Default UI body |
| `text-base` | 16 | Marketing body, primary buttons |
| `text-lg` | 18 | Lead paragraphs |
| `text-xl` | 20 | Card titles |
| `text-2xl` | 24 | Section H2 |
| `text-3xl` | 30 | Dashboard H1, hero subtitle |
| `text-4xl–6xl` | 36–60 | Landing hero only |

### Rules

- **No placeholder-as-label.** Visible labels always.
- **Minimum body 14 px**, minimum label 12 px with 4.5:1 contrast.
- **Tabular numbers** (`tabular-nums`) on scores, counts, and table figures.
- **Code** uses JetBrains Mono with `font-feature-settings: "ss01", "cv11"` inherited from Inter
  body for consistent stylistic alternates.

---

## 4. Component list

### Primitives (`src/components/ui/`)

- `Button` — 8 variants (primary, secondary, ghost, accent, ai, danger, outline, link) × 4 sizes.
  Min height 36 / 44 / 48 / 44 (icon). Focus ring built-in.
- `Card` + `CardHeader` + `CardTitle` + `CardDescription` + `CardContent` + `CardFooter`.
- `Badge` — 7 tones × 2 sizes.
- `Input`, `Textarea`, `Select`, `Label`, `FieldHint`, `FieldError`.
- `Checkbox` — accessible custom check with hidden-input pattern.
- `Switch` — labeled switch with description support, ARIA `role="switch"`.
- `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` — full ARIA tablist with keyboard support.
- `Dialog` — modal with Escape to close, focus trap, scroll lock.

### Brand (`src/components/brand/`)

- `Logo` — `wordmark` / `mark` / `lockup` / `wordmark-light` variants.
- `ProductBadge` — the "AccessOps AI" purple chip.

### Navigation (`src/components/nav/`)

- `SideNav` — desktop primary nav with active state, "New scan" CTA, secondary group, plan/help footer.
- `TopNav` — workspace switcher, search, notifications, account.
- `MobileBottomNav` — 5-tab thumb-reach nav for mobile.

### Scan-domain (`src/components/scan/`)

- `ScanScoreRing` — 3 sizes, color-coded by score threshold, accessible label.
- `SeverityBadge` — 5 severities (`critical` / `moderate` / `minor` / `passed` / `review`), icon + text.
- `WcagBadge` — formatted as `WCAG 2.2` + level pill + criterion text.
- `IssueCard` — link card with severity, category, WCAG, page, chevron.

### Compliance (`src/components/compliance/`)

- `NoGuaranteeBanner` — `default` (full card) and `compact` (inline) variants.
- `HumanReviewBanner` — amber inline notice.
- `ConsentCard` — title + description + optional switch + optional status badge.

### AI (`src/components/ai/`)

- `AiSuggestionBlock` — every AI surface uses this. Renders header + content + the mandatory
  _"Review before implementation"_ footer.
- `CodeDiffBlock` — side-by-side before/after with Copy button.

### Feedback (`src/components/feedback/`)

- `AlertCallout` — `info` / `success` / `warning` / `danger` / `neutral` tones, with optional
  title and action slot.

### Accessibility (`src/components/accessibility/`)

- `A11yProvider` — context for text-size / contrast / motion preferences, persists to `localStorage`,
  writes `<html>` data attributes.
- `SkipToContent` — first focusable on every page.
- `A11ySettingsPanel` — segmented controls bound to `useA11y`.

### Empty / generic

- `EmptyState` — single component handles all 6 empty scenarios from the brief.

---

## 5. Radii, spacing, shadows, motion

| Token | Value |
|---|---|
| `--radius-sm` | 6 px (small chips) |
| `--radius` | 10 px (default cards, buttons) |
| `--radius-md` | 12 px |
| `--radius-lg` | 16 px (large cards, hero) |
| `--radius-xl` | 22 px (CTA pills if used) |
| `--shadow-soft` | Single-layer ambient |
| `--shadow-card` | Cards on canvas |
| `--shadow-pop` | Hero / dialog / final CTA only |

Spacing follows Tailwind's 4 px grid. We rarely exceed `gap-12 / p-12`.

**Motion** — all transitions 150–200 ms ease-out. `prefers-reduced-motion: reduce` and the user
override both zero non-essential animations. The marquee on Landing uses a pause-aware utility
class (`marquee-track`) gated on motion preference.

---

## 6. Accessibility considerations baked in

- Focus rings: 2 px blue, never removed, `:focus-visible` only so mouse users aren't bothered.
- Skip-to-content link visible on focus, top-left.
- Severity always communicated with **icon + color + text**, never color alone.
- Forms: visible labels, `aria-describedby` for hints/errors, `required` attribute when required,
  submit gated when consent is required (Onboarding, New Scan).
- Color is reinforced with shape: severity badges have unique icons; status indicators in tables
  use dot color + numeric value + text.
- All interactive controls ≥ 44 × 44 px tap target on mobile.
- Animations gated on `prefers-reduced-motion` and a user override.
- Print stylesheet for the Client Report — nav hidden, disclaimer preserved.

---

## 7. Composition rules

- One **primary action** per screen (the navy button). Everything else is secondary or ghost.
- One **AI surface** type. Every AI output goes through `AiSuggestionBlock`. No ad-hoc purple cards.
- **Disclaimers** never embedded as raw text. Always via a component — `NoGuaranteeBanner`,
  `HumanReviewBanner`, `DisclaimerCard` (in reports), or the `AiSuggestionBlock` footer.
- **Severity badges** always use the `SeverityBadge` component, never raw colored pills, so the
  icon/color/text triple is preserved.
- **WCAG references** always via `WcagBadge`. Don't ad-hoc the typography.

These rules are what keep the product feeling unified at the scale of 18 screens.
