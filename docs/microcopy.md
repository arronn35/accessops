# maitrico AccessOps AI — Microcopy library

All canonical compliance / disclaimer strings live in
[`src/lib/microcopy/compliance.ts`](../src/lib/microcopy/compliance.ts) and are exported as
`COMPLIANCE_COPY`. Every screen, component, and report references that file rather than
hard-coding strings.

Updating one string updates every surface.

---

## Canonical strings

| Key | Tone | When to use |
|---|---|---|
| `POSITIONING` | Confident, brand | Hero badges, marketing |
| `NO_GUARANTEE_SHORT` | Calm, factual | Inline compact banners |
| `NO_GUARANTEE_FULL` | Calm, factual | Compliance Center, full banners |
| `AUTOMATED_LIMITATIONS` | Educational | Onboarding boundary, Report disclaimer footer |
| `AI_REVIEW_REQUIRED` | Direct, single-sentence | Every `AiSuggestionBlock` footer |
| `AI_DISCLOSURE` | Educational | Compliance Center AI section, prompt input footnote |
| `HUMAN_REVIEW` | Calm | `HumanReviewBanner`, Issue Detail when flagged |
| `REPORT_NOT_LEGAL` | Direct | Report builder preview, report cover, report footer |
| `SCAN_PERMISSION` | Direct, first-person | New Scan consent checkbox |
| `SCAN_PRIVACY` | Direct, instructional | New Scan privacy notice |
| `ONBOARDING_BOUNDARY` | Educational | Onboarding info callout |
| `ONBOARDING_ACK` | Direct, first-person | Onboarding required checkbox |
| `OVERLAY_STANCE` | Confident | Compliance Center posture card |
| `DELETE_SCAN_WARNING` | Warning | Delete confirmation modal |
| `SCREENSHOT_NOTICE` | Educational | Screenshot toggle, screenshot-disabled empty state |

---

## Forbidden phrases

`FORBIDDEN_AI_CLAIMS` lists strings that must never appear in user-facing copy:

- "fully compliant"
- "100% compliant"
- "certified"
- "legally compliant"
- "guaranteed compliance"

A grep over `src/` should produce **zero hits** for these outside the `FORBIDDEN_AI_CLAIMS`
constant itself. Run:

```bash
grep -rEn "fully compliant|100% compliant|legally compliant|guaranteed compliance|certified" src/
```

The only legitimate results are inside `src/lib/microcopy/compliance.ts` itself.

---

## Where each string is rendered

| String | Surfaces |
|---|---|
| `POSITIONING` | Landing hero badge, Pricing intro |
| `NO_GUARANTEE_*` | `NoGuaranteeBanner` → Landing, Pricing, Dashboard card, Scan Results sidebar, Remediation, New Scan, Compliance Center, Report Builder |
| `AI_REVIEW_REQUIRED` | `AiSuggestionBlock` footer (Dashboard, Scan Results, Issue Detail, AI Assistant, Report Builder, Report Preview) |
| `AI_DISCLOSURE` | Compliance Center AI section, AI Assistant prompt footnote, Report Preview footer |
| `HUMAN_REVIEW` | `HumanReviewBanner` → Scan Results, Issue Detail (when `humanReviewRequired`), States gallery, Report disclaimer |
| `REPORT_NOT_LEGAL` | Report Builder preview, Client Report Preview cover + footer + disclaimer block |
| `SCAN_PERMISSION` | New Scan consent checkbox label |
| `SCAN_PRIVACY` | New Scan privacy `AlertCallout` |
| `ONBOARDING_BOUNDARY` | Onboarding info `AlertCallout` |
| `ONBOARDING_ACK` | Onboarding required checkbox label |
| `DELETE_SCAN_WARNING` | Compliance Center "Delete all scan data" card, States gallery delete confirmation, Danger `AlertCallout` |
| `SCREENSHOT_NOTICE` | New Scan "Store screenshots" toggle description, Compliance Center screenshot toggle, States gallery |

---

## Tone-of-voice guidelines for new copy

When extending microcopy:

1. **Calm > alarmist.** "May be required" beats "must be". "Helps identify" beats "detects all".
2. **Direct > evasive.** "We do not guarantee compliance" beats "We strive toward compliance".
3. **First person where action is required.** Consent checkboxes use "I confirm…" and
   "I understand…". Cement personal accountability.
4. **Specific > vague.** Name laws ("ADA, EAA, WCAG, Section 508, EN 301 549"), not
   "applicable regulations".
5. **One disclaimer per surface, full clarity.** Don't stack three short disclaimers; use one
   well-worded sentence and link to the Compliance Center for the long form.

If you introduce a new disclaimer, add it as a key in `compliance.ts`, render it through a
dedicated component if used in 2+ places, and add a row to this document.
