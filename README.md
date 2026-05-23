# maitrico AccessOps AI

> **Accessibility operations, not one-click compliance.**

A privacy-first, AI-assisted accessibility operations platform. AccessOps AI
**helps identify and manage** accessibility issues. It does **not** guarantee
ADA, EAA, WCAG, Section 508, EN 301 549, or any legal compliance, and it does
not issue certification.

This repository contains:

- A Next.js web app (auth, dashboard, scan results, reports, privacy center).
- A Docker scan worker that runs Playwright + axe-core out-of-band.
- A Postgres schema + Drizzle migrations.
- A BullMQ-based queue, with an inline static scanner fallback when Redis is
  not configured.

It targets a **low-cost production stack**:

| Layer | Service | Why |
|---|---|---|
| Web | Vercel | Free hobby tier covers MVP; auto-scales |
| Worker | Railway (Docker) | $5/mo Hobby; long-lived Chromium-friendly host |
| Database | Neon Postgres | Generous free tier, HTTP driver for Vercel |
| Queue / Rate limit | Upstash Redis | Free tier, single source for BullMQ + ratelimit |
| Email (auth) | Resend | Magic-link sign-in, free 3,000 emails/mo |
| AI (optional) | Anthropic | Pay-per-token, off by default per workspace |
| Storage (optional) | Cloudflare R2 | Only if you persist screenshots / PDFs |
| Monitoring (optional) | Sentry / PostHog | Off by default; never blocks production |

**Total fixed cost at idle: ~$5/mo (Railway worker).** Everything else is
free-tier until usage scales.

For the current launch-readiness audit, required production variables, and
remaining 10/10 checklist, see [`docs/production-readiness.md`](docs/production-readiness.md).

Current production web deployment:

- App: <https://accessops-chi.vercel.app>
- Deep health: <https://accessops-chi.vercel.app/api/healthz?deep=1>

---

## Architecture

```
                  ┌─────────────────┐         ┌────────────────┐
   user ───HTTPS──┤  Vercel (Next)  ├──REST───┤ /api/* routes  │
                  │  • Auth.js      │         │  • create scan │
                  │  • RSC pages    │         │  • read status │
                  │  • SSR reports  │         │  • AI explain  │
                  └────────┬────────┘         └────────┬───────┘
                           │ Drizzle (Neon HTTP)        │ BullMQ enqueue
                           ▼                            ▼
                  ┌──────────────────┐         ┌────────────────┐
                  │  Neon Postgres   │◄────────┤ Upstash Redis  │
                  │  17 tables       │         │  scan queue    │
                  └────────▲─────────┘         └────────┬───────┘
                           │                            │ BullMQ consume
                           │                   ┌────────▼─────────┐
                           │                   │  Railway worker  │
                           │ writes ◄──────────┤  Playwright +    │
                           │                   │  @axe-core/      │
                           │                   │  playwright      │
                           │                   └──────────────────┘
```

**Heavy browser work runs in the worker.** When Redis/worker infrastructure is
not configured, Vercel functions fall back to a bounded static HTML scanner so
authorized users can still create real findings instead of hitting a queue
failure.

---

## Getting started locally

### Prerequisites

- Node 20+
- Docker (for local Postgres + Redis)

### One-time setup

```bash
git clone … accessops
cd accessops
cp .env.example .env.local
# fill in DATABASE_URL, REDIS_URL, AUTH_SECRET at minimum
npm install
npx playwright install chromium    # only needed for local worker
```

### Bring up data services

```bash
docker compose up -d postgres redis
```

### Migrate the database

```bash
npm run db:push          # for dev (drops & recreates as needed)
# or, in production:
npm run db:migrate
```

### Run web + worker

In two terminals:

```bash
# terminal 1 — web app
npm run dev

# terminal 2 — scan worker
WORKER_PROCESS=1 npm run worker:dev
```

Web is at <http://localhost:3000>, worker health at
<http://localhost:8080/healthz>.

### Quick scanner smoke test (no UI, no queue)

```bash
npx tsx scripts/scan-test.ts https://example.com
```

This prints normalized axe findings to stdout — useful for verifying the
scanner module in isolation.

---

## Deployment

### 1. Neon Postgres

1. Create a project at <https://console.neon.tech>.
2. Copy the `postgres://…?sslmode=require` connection string.
3. From a local checkout with that connection string in `.env.local`, run:
   ```bash
   npm run db:migrate
   ```
4. Save the URL — both Vercel and Railway need it.

### 2. Upstash Redis

1. Create a free database at <https://console.upstash.com>.
2. Copy the `REDIS_URL` (the `rediss://default:…@…upstash.io:6379` URL,
   **not** the REST URL).
3. Optionally also copy the REST URL + token for rate limiting (the API
   layer auto-falls-back to a no-op limiter when these are absent).

### 3. Vercel (web app)

```bash
vercel link
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add AUTH_SECRET            # openssl rand -base64 32
vercel env add AUTH_URL               # https://your-app.vercel.app
vercel env add NEXT_PUBLIC_APP_URL    # same as AUTH_URL
vercel env add ADMIN_EMAILS           # comma-separated tester admins
vercel env add RESEND_API_KEY
vercel env add AUTH_EMAIL_FROM
vercel env add UPSTASH_REDIS_REST_URL  # optional
vercel env add UPSTASH_REDIS_REST_TOKEN  # optional
vercel env add ANTHROPIC_API_KEY      # optional; mock fallback if absent
vercel env add INLINE_SCAN_FALLBACK_ENABLED  # optional degraded mode only; defaults to false
vercel env add STRIPE_SECRET_KEY             # optional until billing is launched
vercel env add STRIPE_WEBHOOK_SECRET         # optional until billing is launched
vercel env add STRIPE_PRICE_STARTER          # optional until billing is launched
vercel env add STRIPE_PRICE_AGENCY           # optional until billing is launched
vercel env add STRIPE_PRICE_TEAM             # optional until billing is launched
vercel --prod
```

For the current production tester account, set `ADMIN_EMAILS` to
`efeg6567@gmail.com`. Admin allowlisted users are upgraded only inside their
own workspace: role `owner`, workspace plan `enterprise`, and matching
`usage_limits.plan`.

Important: **do NOT enable Playwright on Vercel.** It is not supported in
serverless functions and the worker is doing this job. If `REDIS_URL` is not
configured, scan creation returns `queue_unavailable` unless
`INLINE_SCAN_FALLBACK_ENABLED=true` is explicitly set for a temporary degraded
static scan mode.

### 4. Railway (scan worker)

1. New project → Deploy from GitHub repo → select this repo.
2. Add a **new service** with the path-based deploy:
   - Root directory: `/`
   - Dockerfile path: `Dockerfile.worker`
3. Railway reads `railway.json`, builds `Dockerfile.worker`, and health-checks `/healthz`.
4. Add environment variables:
   - `DATABASE_URL` (same Neon URL)
   - `REDIS_URL` (same Upstash URL)
   - `WORKER_PROCESS=1`
   - `WORKER_CONCURRENCY=1` (start low; raise per CPU)
   - `SCAN_TIMEOUT_MS=60000`
   - `WORKER_HEALTH_PORT=8080`
   - `NODE_ENV=production`
5. Railway will build the Dockerfile, expose port 8080 (the health
   endpoint), and start the worker. Logs should show `[worker] starting`
   followed by `[worker] health on :8080/healthz`.

### 5. Optional: Cloudflare R2

Only needed if you decide to persist screenshots or pre-built PDFs. For
MVP we skip R2 entirely — reports render on demand and screenshots are
off by default. To enable later, set the four `S3_*` env vars in the
worker; the scanner module will start writing to the bucket.

---

## Important boundaries enforced by the code

These are **not** just docs — they're constraints in the codebase:

1. **No legal compliance claims.** `src/lib/microcopy/compliance.ts` is
   the single source of disclaimer copy. AI output is post-processed to
   strip forbidden phrases (`fully compliant`, `100% compliant`,
   `legally compliant`, `guaranteed compliance`, `certified`). See the
   `FORBIDDEN_AI_CLAIMS` list and `src/lib/ai/explain.ts`.

2. **SSRF protection on every scan.** `src/lib/scanner/url-validation.ts`
   rejects:
   - private/RFC1918, loopback, link-local, multicast, broadcast
   - cloud metadata addresses (169.254.169.254 etc.)
   - reserved TLDs (`.localhost`, `.internal`, `.example`, …)
   - `file://`, `ftp://`, `javascript:` etc.
   - URLs longer than 2 KB and hosts longer than 253 chars
   The worker re-validates the **resolved** URL after every redirect.

3. **AI requires explicit workspace consent.** Toggle lives in
   Privacy & Compliance Center. The API endpoint returns
   `403 ai_disabled` when off. The UI shows a deep link to the toggle.

4. **Screenshots are off by default.** The New Scan form, the worker,
   and the API endpoint all default `includeScreenshots: false`. Storing
   screenshots requires a separate workspace-level toggle AND the
   per-scan toggle to both be on.

5. **Permission confirmation is required before every scan.** A literal
   `permissionConfirmed: true` is enforced by Zod at the API layer and
   double-checked by the worker before the browser launches.

6. **Rate limits on three high-cost surfaces.** `scan_create` (5/min),
   `ai_explain` (60/hr), `report_export` (30/hr) — all per workspace
   via `@upstash/ratelimit`. Falls back to a no-op limiter when Upstash
   isn't configured, so local dev still works.

7. **Audit logging on every privileged action.** scan.created,
   scan.completed, issue.updated, task.created/updated/deleted,
   ai.explain, report.created/exported, privacy.updated,
   privacy.scan_deleted, privacy.workspace_exported.

8. **Plan caps enforced at the API.** Free plan: 3 scans/day, 3
   pages/scan. Workspace concurrency: 1 in-flight scan by default.
   Configurable via `SCAN_MAX_PAGES_*` and
   `MAX_CONCURRENT_SCANS_PER_WORKSPACE`.

---

## Scan flow (end-to-end)

```
User opens /app/scans/new
  ↓ enter URL, scan type, max pages, consent checkbox
POST /api/scans
  ├─ Zod validation
  ├─ URL validator (synchronous SSRF check)
  ├─ Rate limit (5/min/user)
  ├─ Plan caps (3 scans/day, max pages)
  ├─ Concurrency cap (1 in-flight per workspace)
  ├─ Privacy gate (force screenshots off / AI off if workspace disabled them)
  ├─ INSERT scan_jobs (status=queued)
  ├─ BullMQ enqueue
  ├─ INSERT audit_logs
  └─ Return { scanJobId }
  ↓
Browser navigates to /app/scans/:id/progress (RSC + client poll)
  ↓ polls GET /api/scans/:id/status every 1.5–2.5s
Worker picks up job
  ├─ UPDATE scan_jobs status=running, progressStep=starting_browser
  ├─ Re-validate URL with DNS resolution (SSRF defense)
  ├─ Launch Chromium (no-sandbox, blocked resource types)
  ├─ For each page (BFS, same-origin):
  │   ├─ Navigate with deadline
  │   ├─ Re-validate final URL post-redirect
  │   ├─ Inject @axe-core/playwright
  │   ├─ Run axe.analyze() with WCAG 2.2 AA-oriented tags
  │   ├─ Normalize results → NormalizedIssue[]
  │   └─ Update progress in scan_jobs
  ├─ Persist scan_pages + accessibility_issues
  ├─ Bump usage_limits.pagesScannedThisMonth
  ├─ INSERT audit_logs (scan.completed)
  └─ UPDATE scan_jobs status=completed
  ↓
Polling sees status=completed
  ↓
Client redirects to /app/scans/:id (results page)
```

---

## Local development tips

- **No Docker?** Install Postgres and Redis natively. Just point
  `DATABASE_URL` and `REDIS_URL` at them.
- **Bullmq vs Upstash REST**: BullMQ needs a persistent connection,
  which Upstash supports via the `rediss://` URL but **not** the REST
  URL. Use the right one.
- **Playwright on Apple Silicon**: `npx playwright install chromium`
  pulls the right binary. If the worker container fails on M-series,
  ensure the Dockerfile is using `mcr.microsoft.com/playwright:…-jammy`
  not an Alpine variant.
- **Forgetting `WORKER_PROCESS=1`** in the worker shell: the DB client
  will default to the Neon HTTP driver and lose persistent connection
  benefits. The env var is set automatically inside the Docker image.
- **Schema changes**: `npm run db:generate` to produce a new migration
  SQL file, `npm run db:migrate` to apply.

---

## Tests

```bash
npm test          # one-shot
npm run test:watch
```

Covers: URL validation + SSRF rules, scan source discovery, axe result
normalization, AI consent / sanitization, report HTML/CSV rendering. 69
tests at the time of writing.

---

## Known limitations

- **Single-workspace per user in MVP.** Multi-workspace switching ships
  in a follow-up release.
- **Member invites are live.** The Team page has an invite form. Invites
  go through Resend (same configuration as magic-link auth) and expire
  after 14 days. When email isn&apos;t configured the invite is created
  and the accept URL can be shared manually.
- **Sitemap and manual-URL-list scans are live.** They share the same
  same-origin and SSRF protections as single/multi scans, store source
  metadata on the scan job, and are processed by the browser worker when
  Redis is configured.
- **PDF export is worker-rendered to R2 when configured.** Set the four
  `S3_*` env vars on the worker (and `REDIS_URL` for the queue) and the
  web app enqueues a Playwright-rendered PDF, uploads to R2, and
  redirects to a signed URL. Without S3 or Redis the export route falls
  back to the original print-HTML path so the product still works.
- **No GitHub PR integration** yet. On the roadmap.
- **Authenticated staging scans not supported** yet. The privacy guard
  intentionally blocks login flows.

---

## Roadmap

- Authenticated staging scans (cookie / header injection)
- GitHub integration: scan-on-PR, fix suggestions as review comments
- Chrome extension for ad-hoc page audits
- Shopify / WordPress / Webflow / Framer plugins
- CLI scanner + CI/CD accessibility gate
- Branded agency report templates
- Multi-language report output
- SSO / SAML
- Stripe billing
- Enterprise local scanner
- Human expert review marketplace
- Custom DPA workflow

---

## Disclaimer

AccessOps AI is an accessibility assessment aid, not a legal certification.
Automated tools cannot detect every accessibility barrier; human review by
qualified professionals may be required. Reports produced by this product
do not guarantee compliance with ADA, EAA, WCAG, Section 508, EN 301 549,
or any other law or regulation.
