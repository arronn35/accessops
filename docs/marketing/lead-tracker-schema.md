# Percevia AI Lead Tracker Schema

Updated: 2026-06-27

The lead tracker is deliberately conservative. Every row must be auditable from public sources and should be safe for low-volume B2B outreach.

## Required Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| `lead_id` | text | yes | Stable ID, e.g. `AG-TR-001` or `EC-DE-001`. |
| `company_name` | text | yes | Legal or trading name used on the public site. |
| `website` | URL | yes | Company website. |
| `country` | text | yes | Country of company or main market. |
| `segment` | enum | yes | `agency` or `ecommerce`. |
| `platform_hint` | text | yes | Shopify, WooCommerce, Webflow, Framer, Magento, custom, unknown, etc. |
| `contact_email` | email | yes | Public business email only. |
| `email_type` | enum | yes | `role`, `personal_public`, `support`, `sales`, `partnerships`. |
| `source_url` | URL | yes | Exact page where the email or contact route was found. |
| `source_context` | text | yes | Where/how the email appeared, e.g. footer, contact page, imprint. |
| `fit_score` | number | yes | 1-100 score using the playbook rubric. |
| `personalization_hook` | text | yes | First-line personalization proof. |
| `outreach_angle` | text | yes | `agency_white_label`, `ecommerce_checkout`, etc. |
| `status` | enum | yes | Starts as `not_contacted`. |
| `compliance_notes` | text | yes | Notes on public source, opt-out, support inbox caution, etc. |
| `last_verified_at` | date | yes | ISO date, e.g. `2026-06-27`. |

## Status Values

- `not_contacted`
- `queued`
- `sent_1`
- `sent_2`
- `sent_3`
- `sent_4`
- `replied_positive`
- `replied_neutral`
- `replied_negative`
- `bounced`
- `unsubscribed`
- `do_not_contact`

## Outreach Angles

- `agency_white_label`
- `agency_retainer`
- `agency_remediation_board`
- `ecommerce_checkout`
- `ecommerce_mobile_forms`
- `ecommerce_eu_accessibility`
- `product_team_release_cycle`

## Quality Gate

Before a lead enters a sending queue:

1. `source_url` opens successfully.
2. Email is visible in source page text, mailto, footer, imprint, or trusted public profile.
3. `personalization_hook` is specific to the company, not generic.
4. `fit_score` is 70 or higher, unless the lead is intentionally marked for later nurture.
5. `compliance_notes` says why the address is acceptable for low-volume B2B outreach.
6. No row uses guessed email patterns.

## Suppression Rules

Immediately set `status` to `do_not_contact` when:

- The company asks not to be contacted.
- The source page says the address is not for sales/marketing.
- The recipient opts out.
- The email bounces and no better public address exists.
- The company is clearly outside the target market.
