# maitrico AccessOps AI — UX flow map

## Primary acquisition → activation flow

```
Landing  →  Onboarding  →  Workspace Setup  →  New Scan  →  Scan Progress  →  Scan Results
   /            /onboarding       /workspace/setup       /app/scans/new        /app/scans/[id]/progress       /app/scans/[id]
```

The activation flow is gated by **two consent checkpoints**:

1. **Onboarding** — the user must check
   _"I understand that automated accessibility scanning has limitations and that human review may be required."_
   Submit is disabled until this is checked.
2. **New Scan** — the user must check
   _"I confirm I have permission to scan this website."_
   "Start scan" is disabled until this is checked.

We deliberately gate these client-side. In production we'd also enforce them server-side and audit
who acknowledged what.

---

## Authenticated app flows

```
Dashboard (/app)
├─ New Scan (/app/scans/new) ─→ Progress ─→ Results ─→ Issue Detail
├─ Remediation board (/app/remediation)
├─ AI Fix Assistant (/app/ai-assistant)
├─ Reports
│   ├─ Builder  (/app/reports/builder)
│   └─ Preview  (/app/reports/preview)
├─ Team & Roles (/app/team)
├─ Privacy & Compliance Center (/app/compliance)
└─ Settings (/app/settings)
```

### Working a single finding (the core loop)

```
Scan Results
   └─ click any issue
      └─ Issue Detail
         ├─ Read "Why this matters" + "Who this affects"
         ├─ Read "How to fix" + copy the After code
         ├─ Read the AI-generated explanation (with "Review before implementation" footer)
         ├─ Tick off Manual verification checklist items
         └─ Status dropdown → "In Progress" → … → "Fixed"
            └─ Card moves on Remediation Board automatically
```

### Building a report

```
Scan Results
   └─ "Build report" CTA
      └─ Report Builder (/app/reports/builder)
         ├─ Select sections (Risk Disclaimer is REQUIRED, cannot uncheck)
         ├─ Pick format (PDF / HTML / CSV)
         ├─ Preview pane updates live
         └─ "Preview report"
            └─ Client Report Preview (/app/reports/preview)
               ├─ Print / Download PDF (mocked)
               └─ Disclaimer ALWAYS visible on the cover and the footer
```

---

## Privacy-first scan flow

The brief makes privacy a *primary* product property, not a tab in settings. Here's how it
threads through:

1. **New Scan** screen:
   - URL input, scan type (single / multi / sitemap / manual).
   - "Capture screenshots" is **off by default**.
   - "Store screenshots" is **disabled** until "Capture" is on, and **off by default** even then.
   - AI toggles default ON but are reviewable.
   - Inline `AlertCallout` titled **Privacy notice** reminds users not to scan private dashboards
     or pages with sensitive personal data.
   - **Consent checkbox** ("I confirm I have permission to scan this website.") gates submission.

2. **Scan Progress** screen:
   - Calm 6-step timeline (no spinners-of-doom).
   - A "What we're capturing" panel transparently lists:
     - ✅ Page HTML structure (no form values)
     - ✅ Computed accessibility tree
     - ✅ Color contrast samples
     - ❌ Screenshots — off by default
     - ❌ Cookies & local storage — never captured
   - `NoGuaranteeBanner` is co-located.

3. **Scan Results** screen:
   - Always shows the `HumanReviewBanner` and `NoGuaranteeBanner` in the sidebar.
   - "Risk score" — never labeled "compliance score".

4. **Issue Detail** screen:
   - Every AI explanation lives inside an `AiSuggestionBlock` (purple, with the
     "Review before implementation" footer).
   - Issues flagged `humanReviewRequired` show an extra inline `HumanReviewBanner` at the bottom
     of the manual checklist.

5. **Privacy & Compliance Center** (`/app/compliance`):
   - Highest-trust screen. Aggregates everything: compliance posture, AI processing consent
     toggles, retention period, region selector, team access log, subprocessor list, legal docs.
   - Action cards for **Export workspace data** and **Delete all scan data**.
   - The delete action is rendered with the canonical danger pattern shown in `/app/states`.

---

## AI surface guardrails

The AI Fix Assistant (`/app/ai-assistant`) is constrained by design:

- A prominent `AlertCallout` titled **"What this assistant will not do"** appears above the chat
  with three bullets:
  - Will not claim your site is compliant with any law or standard.
  - Will not issue or imply certification.
  - Will not recommend accessibility overlays as a substitute for real fixes.
- The framework picker (React, HTML, Shopify, WordPress, Webflow, Framer) constrains output to
  the user's stack.
- Preset actions limit free-text legal-claim surface area:
  - Explain in plain language
  - Generate React / HTML / Shopify / WordPress fix
  - Generate test checklist
  - Draft client-friendly explanation
- All output is rendered inside `AiSuggestionBlock`, which appends the mandatory review notice.

---

## Empty & error states (gallery at `/app/states`)

The brief enumerates these specifically; all are implemented and visible in the gallery route:

**Empty states**
- No scans yet
- No issues found (positive emphasis)
- No workspace members
- No reports generated
- AI processing disabled
- Screenshots disabled

**Warning / error states**
- Invalid URL
- Scan blocked by robots / timeout
- Private page warning
- AI consent required
- Screenshot storage warning
- Human review required
- No compliance guarantee
- Delete confirmation (modal with type-to-confirm pattern)

---

## Navigation principles

- **Desktop:** Left side nav + top utility nav. Primary CTA ("New scan") lives in the side nav
  for predictability.
- **Mobile:** Bottom tab bar (Home / Scans / Tasks / Privacy / Settings). The side nav collapses
  off-screen.
- **Cross-screen breadcrumb pattern:** Every nested screen has an unobtrusive
  "← parent" link in the top-left of the content area.
