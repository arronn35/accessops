# maitrico AccessOps AI - Production Readiness

Last reviewed: 2026-06-11

## Current Stack

| Area | Status | Notes |
|---|---:|---|
| Web | Ready | Next.js on Vercel. |
| Auth | Ready | Firebase Auth email link + GitHub provider. |
| Data | Ready | Firestore repositories through Firebase Admin SDK. |
| Dispatch | Ready | Firestore polling: `POST /api/scans` writes a `queued` job; the browser worker claims it atomically. No queue infra. |
| Scanner | Ready | Dedicated browser worker (`worker/index.ts`) runs the real Playwright + axe-core engine. Static HTML scan kept only as in-worker fallback if Chromium fails to launch. See `docs/worker-deploy.md`. |
| Reports | Ready | HTML/CSV export and printable HTML fallback for PDF. |
| Storage | Firestore only | Visual-evidence screenshots (consented, redacted, 650 KB cap, expiring) live in Firestore; no object storage in V1. |
| Privacy deletion | Ready | `POST /api/privacy/delete-scan-data` returns `202` with a tracked job in `dataDeletionJobs`; the worker deletes scans/issues/evidence/reports and verifies zero residue before marking it completed. `DELETE /api/scans/:id` removes a single scan. |
| Retention | Ready | Daily cron (`/api/cron/data-retention`, 03:17 UTC) applies each workspace's `scanDataRetentionDays` and purges expired visual evidence. Protect with `CRON_SECRET`. |
| Rate limiting | Ready | Shared fixed-window counters in the `rateLimits` collection (all instances share budgets); falls back in-memory without Admin creds and fails open on Firestore errors. |
| Billing | Disabled | Paid-plan API surface removed; plan selection updates Firestore entitlement only. |

## Production Env

Required on Vercel:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_SESSION_COOKIE_NAME=accessops_session`
- `FIREBASE_SESSION_DAYS=7`

Required on the browser worker container (see `docs/worker-deploy.md`):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SCAN_RENDER_PROFILE=real`
- `WORKER_CONCURRENCY` (default 2)
- `WORKER_POLL_INTERVAL_MS` (default 3000)
- `WORKER_SCAN_TIMEOUT_MS` (default 120000)
- `WORKER_STALE_RUNNING_MS` (default 180000)

Recommended quota guards:

- `FREE_GLOBAL_SCANS_PER_DAY=50`
- `SCAN_DAILY_CAP_FREE=3`
- `SCAN_MAX_PAGES_FREE=3`
- `MAX_CONCURRENT_SCANS_PER_WORKSPACE=1`
- `MAX_PERSISTED_ISSUES_PER_SCAN=100`

Optional:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults to `gpt-5.3-codex`)
- `SENTRY_DSN`
- `POSTHOG_KEY`
- `CRON_SECRET` (strongly recommended: gates `/api/cron/data-retention` behind Vercel's cron bearer token)
- `WORKER_HEARTBEAT_FRESH_MS` (default 120000 — deep-health threshold for scan-worker liveness)

One-time Firestore setup (Google Cloud console → Firestore → TTL):

- TTL policy on `rateLimits.expireAt` (stale rate-limit windows)
- TTL policy on `workerHeartbeats.expireAt` (dead worker ids)

Correctness does not depend on either policy; they only bound storage growth.

## Smoke Checklist

- `GET /api/healthz` returns `200` and `ok: true`.
- `GET /api/healthz?deep=1` confirms Firestore configuration and reports
  `checks.worker.ok: true` while the worker is running (`degraded: true`
  appears when the freshest worker heartbeat is older than the threshold).
- `/auth/sign-in` renders Firebase email link and GitHub sign-in options.
- `POST /api/scans` returns `201 { scanJobId, mode: "queued" }`.
- The worker container logs `[worker] starting ...` then claims and completes the job.
- A completed scan shows `engine="playwright-axe"` and `resultConfidence="high"` (not `static-html-fallback`/`low`).
- Public report share `/r/:token` reads from Firestore.

## Known Limits

- Visual evidence/screenshots require workspace consent and are stored in Firestore (650 KB/screenshot cap).
- Invitation emails are delivered through Firebase Auth email-link sign-in (no SMTP provider); if Firebase declines the send, the UI falls back to manual link sharing. Billing remains disabled; plan selection is an entitlement switch.
- The deprecated `POST /api/internal/scans/process` endpoint runs a static-only scan and is retained as a manual fallback (secret-guarded); the worker is authoritative.
