# maitrico AccessOps AI — Production Readiness Analysis

Last reviewed: 2026-05-23

## What This Project Is

AccessOps AI is a privacy-first accessibility operations SaaS. It is not an overlay and it does not promise legal compliance. The product helps teams scan websites, review automated accessibility findings, create remediation tasks, request AI explanations when consent is enabled, and export audit-ready reports with clear limitations.

The current codebase is an advanced MVP, not a static landing page. It already has a product shell, authenticated app routes, workspace-scoped APIs, database schema, queue producer, scan worker, report renderer, privacy center, and compliance-safe microcopy.

## System Map

| Area | Status | Notes |
|---|---:|---|
| Marketing site | Ready | Landing, pricing, onboarding, metadata, robots, sitemap. |
| Auth | Ready | Auth.js v5 database sessions, Resend magic links, optional GitHub OAuth. |
| Workspace bootstrap | Ready | First user gets workspace, owner membership, privacy settings, usage limits. |
| Database | Ready | Drizzle schema and migration exist for users, workspaces, scans, issues, tasks, reports, privacy, audit, usage. |
| API authorization | Good | Protected APIs call `requireSession()` and verify workspace membership. |
| Edge UX gate | Updated | Next.js 16 `src/proxy.ts` checks session cookie before protected pages/APIs. |
| Scanner | Ready | Playwright + axe-core worker validates URLs, scans pages, normalizes findings. Vercel has a bounded static HTML scanner fallback when Redis is absent. |
| Queue | Optional for fallback mode | BullMQ producer/consumer uses Redis when configured; inline static fallback keeps scan creation working without Redis. |
| Reports | Ready | HTML and CSV export; PDF is worker-rendered to R2 when `S3_*` and `REDIS_URL` are set, with a print-HTML fallback otherwise. |
| AI explanations | MVP-ready | Anthropic when configured; mock fallback when absent; workspace consent gate enforced. |
| Privacy center | Good | AI/screenshot toggles, export workspace data, delete scan data, audit logs. |
| Observability | Lightweight | Structured logs, optional Sentry envelope POST, optional PostHog capture. |
| Billing | Wired (test mode pending live keys) | Stripe Checkout + Customer Portal + webhook handler. Plan caps already key off `usage_limits.plan`; webhook syncs that on subscription events. |

## User-Facing Flow

1. Visitor lands on the marketing site and starts onboarding or signs in.
2. User receives a Resend magic-link sign-in email, or uses GitHub OAuth if configured.
3. On first sign-in, the app creates a default workspace with conservative privacy settings.
4. User starts a scan, confirms permission, and chooses single-page or multi-page mode.
5. Web API validates the URL, enforces rate limits, plan caps, privacy toggles, and enqueues a BullMQ job.
6. Railway worker consumes the queue, launches Chromium, runs axe-core, persists pages and issues.
7. User watches scan progress, opens results, updates issue states, and creates remediation tasks.
8. If workspace AI consent is enabled, user can generate AI explanations for issues.
9. User builds and exports reports with non-legal disclaimers embedded.

## Backend And API Surface

Protected routes are workspace scoped:

- `POST /api/scans`: create scan job, validate URL, enforce caps, enqueue worker job or run inline static fallback.
- `GET /api/scans`: list scans.
- `GET /api/scans/:id`: scan summary.
- `GET /api/scans/:id/status`: polling endpoint for progress UI.
- `GET /api/scans/:id/issues`: issue list with severity filter validation.
- `GET/PATCH /api/issues/:id`: issue detail and status updates.
- `POST /api/issues/:id/ai-explanation`: gated AI explanation generation.
- `POST/GET /api/remediation-tasks`: task creation/listing.
- `PATCH/DELETE /api/remediation-tasks/:id`: task updates/deletion with assignee workspace validation.
- `POST/GET /api/reports`: create/list reports.
- `GET /api/reports/:id`: report metadata.
- `GET /api/reports/:id/export`: validated `html`, `csv`, `pdf` export modes.
- `GET/PATCH /api/privacy/settings`: privacy toggles, owner/admin only for updates.
- `GET /api/privacy/audit-logs`: owner/admin audit feed.
- `GET /api/privacy/export-workspace-data`: owner/admin full workspace export.
- `POST /api/privacy/delete-scan-data`: owner/admin scan deletion.
- `GET /api/healthz`: liveness; `?deep=1` checks DB and Redis, or reports inline fallback mode when Redis is intentionally absent.

## Changes Completed In This Review

- Replaced deprecated Next.js 16 `src/middleware.ts` with `src/proxy.ts`.
- Removed `next/font/google` build dependency so local and CI builds do not need Google Fonts network access.
- Added `robots.txt` and `sitemap.xml` metadata routes.
- Added Open Graph metadata and stable `metadataBase`.
- Validated report export format instead of accepting arbitrary query values.
- Validated issue severity filter.
- Verified remediation task assignees belong to the current workspace before assignment.
- Corrected scanner SSRF documentation to match the implemented behavior.

## Verification

Current local verification:

- `npm test`: 65 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.2.6 after running outside the sandbox restriction that blocked Turbopack helper process creation.

Current production verification:

- Vercel production app: <https://accessops-chi.vercel.app>
- Deep health endpoint: `ok: true` with `database.ok: true`; Redis may report `mode: "inline-fallback"` until Upstash is connected.
- Neon migrations have been applied to production.
- Upstash Redis is optional for the current Vercel fallback mode and still recommended for worker-backed high-volume scans.

## Required Services And Environment Variables

### Minimum production web app

Set these in Vercel:

- `NEXT_PUBLIC_APP_URL`: production origin, for example `https://accessops-chi.vercel.app`
- `AUTH_URL`: same production origin, no trailing slash.
- `AUTH_SECRET`: generate with `openssl rand -base64 32`.
- `ADMIN_EMAILS`: comma-separated tester/admin emails. For the current production
  tester, set `efeg6567@gmail.com`.
- `DATABASE_URL`: Neon Postgres connection string with SSL.
- `REDIS_URL`: Upstash Redis `rediss://` connection string for BullMQ enqueue.
- `INLINE_SCAN_FALLBACK_ENABLED`: optional; defaults to enabled. Set to `false`
  only when Redis and the worker are required for every scan.
- `RESEND_API_KEY`: Resend API key for magic-link auth.
- `AUTH_EMAIL_FROM`: verified sender, for example `AccessOps AI <noreply@yourdomain.com>`.

### Minimum production worker

Set these in Railway:

- `DATABASE_URL`: same Neon Postgres URL.
- `REDIS_URL`: same Upstash Redis URL.
- `WORKER_PROCESS=1`
- `WORKER_CONCURRENCY=1`
- `SCAN_TIMEOUT_MS=60000`
- `WORKER_HEALTH_PORT=8080`
- `NODE_ENV=production`

### Recommended cost and abuse controls

Set these in Vercel:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SCAN_MAX_PAGES_FREE=3`
- `SCAN_MAX_PAGES_STARTER=50`
- `SCAN_MAX_PAGES_AGENCY=200`
- `SCAN_MAX_PAGES_TEAM=500`
- `SCAN_MAX_PAGES_ENTERPRISE=1000`
- `SCAN_DAILY_CAP_FREE=3`
- `SCAN_DAILY_CAP_STARTER=50`
- `SCAN_DAILY_CAP_AGENCY=200`
- `SCAN_DAILY_CAP_TEAM=500`
- `SCAN_DAILY_CAP_ENTERPRISE=1000`
- `MAX_CONCURRENT_SCANS_PER_WORKSPACE=1`
- `SCREENSHOT_STORAGE_ENABLED=false`
- `AI_PROCESSING_ENABLED=false`

### Optional AI

- `ANTHROPIC_API_KEY`
- `AI_PROVIDER=anthropic`

AI remains disabled per workspace until `privacy_settings.ai_processing_enabled` is enabled by an owner/admin.

### Optional OAuth

- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

### Optional storage

Only needed for persisted screenshots and server-generated PDF files:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_PUBLIC_URL`

### Optional observability

- `SENTRY_DSN`
- `POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

### Billing (Stripe)

The web app exposes:

- `POST /api/billing/checkout` (owner/admin only) → Stripe Checkout for `{ plan: "starter" | "agency" | "team" }`.
- `POST /api/billing/portal` → Stripe Customer Portal for an existing customer.
- `GET  /api/billing/status` → current plan + subscription state for UI.
- `POST /api/billing/webhook` → handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_failed`. Updates `workspaces.{plan,stripe_*}` AND `usage_limits.plan` so existing scan caps in `src/app/api/scans/route.ts` honor the new plan without code changes.

Set in Vercel:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (point a Stripe endpoint at `https://<host>/api/billing/webhook`)
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_AGENCY`
- `STRIPE_PRICE_TEAM`

Free + Enterprise are intentionally NOT self-serve: Free is the default,
Enterprise routes through `sales@maitrico.com`. The pricing CTAs handle this.

## Remaining Work For A True 10/10 Launch

### Must Do Before Real Users

- Deploy the Railway worker from `Dockerfile.worker` for high-volume and full browser/axe scans.
- Configure Resend verified domain and production sender.
- Run a real scan on a permitted public URL and confirm results are written by the worker or inline fallback.
- Add a real support/contact channel and legal documents for terms/privacy.

### Strongly Recommended

- Add Stripe billing if paid plans are exposed beyond marketing.
- Partially complete: Playwright project lives under `e2e/` with a `marketing` lane (landing, pricing, legal smoke) and a `ui-mocks` lane (sign-in form, pricing CTA via API stubs). CI workflow `.github/workflows/e2e.yml`. Authenticated dashboard flows (scan create→progress→results, issue update, task CRUD, report export) still need a test sign-in helper to drive directly without a live DB.
- Add production log drain or Sentry DSN before beta users.
- ~~Add data retention automation for `scanDataRetentionDays`.~~ Done — Vercel Cron at `/api/cron/data-retention` runs daily and writes a `privacy.scan_deleted` audit row per purged scan. Set `CRON_SECRET` in Vercel.
- Add worker-side retry visibility in the UI for failed queue jobs.
- Add sitemap scan and manual URL list modes or keep them visually disabled as currently implemented.
- Add R2-backed screenshot/PDF storage only after privacy and retention policies are finalized.

### Nice To Have

- Multi-workspace switcher.
- Team invitation email flow.
- Real notification center.
- Web vitals analytics.
- More granular role permissions beyond owner/admin checks.
- Domain ownership verification for high-volume scans.
