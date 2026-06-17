# Browser scan worker — deployment

The worker (`worker/index.ts`) is the production scan engine. It polls Firestore
for `queued` scan jobs, claims them atomically, and runs the real
Playwright + axe-core scanner. The Vercel web app only creates jobs; it never
runs Chromium.

## Architecture

```
Browser → POST /api/scans (Vercel) → Firestore scans/{id} status="queued"
                                          │  poll + atomic claim
                Worker container (Playwright image) → runScanJob()
                real axe-core scan → persistScanOutcome() + completeScanJob()
                                          │
                status="completed", engine="playwright-axe"
```

Dispatch is **Firestore polling** — there is no separate queue
infrastructure. Concurrency is bounded by `WORKER_CONCURRENCY`. An independent
60-second sweeper requeues crashed workers' jobs once their heartbeat is older
than `WORKER_STALE_RUNNING_MS` and fails jobs cleanly after repeated reclaims.

## Browser lifecycle & memory

The worker launches **one Chromium per process** at first use and opens an
isolated `browser.newContext()` per page job (one context per page in legacy
whole-scan mode). Contexts are always closed in a `finally`; the browser is
long-lived. This is what keeps a 2 GB instance stable — there is no full browser
launch per job.

- **Supported baseline: `WORKER_CONCURRENCY=2` (two concurrent contexts) on a
  2 GB Railway instance.** Raise concurrency only with proportionally more RAM.
- **Crash recovery:** the worker listens for Chromium's `disconnected` event. A
  crash marks the in-flight page job for retry (it requeues via the normal
  page-job retry path) and relaunches Chromium with exponential backoff (up to
  `WORKER_BROWSER_RELAUNCH_ATTEMPTS`, default 3). If every relaunch fails, the
  worker reports unhealthy on `/healthz` (503) and exits nonzero so the platform
  restarts the container.
- **Memory guard:** after every page job the worker checks `process.memoryUsage().rss`.
  Above `WORKER_MAX_RSS_MB` (default 1536) **or** after `WORKER_BROWSER_RECYCLE_JOBS`
  jobs (default 50) it gracefully closes and relaunches Chromium between jobs and
  logs `browser.recycled` with the reason (`rss` or `jobs`). Under sustained
  concurrency it stops issuing new contexts until the in-flight ones drain so the
  recycle can happen on an idle browser.
- **Page hygiene:** the real/minimal request-blocking profiles and the ~10 MB
  per-page response cap are unchanged; navigation/action timeouts are derived
  from the 60 s page budget (navigation ≤ 30 s) rather than Playwright defaults.

## Required Firestore indexes

The poll uses collection-group queries on `scans`. Create these once (the first
run also prints a console link that builds them for you):

- `scans` (collection group): `status` ASC, `createdAt` ASC
Or via `firestore.indexes.json` + `firebase deploy --only firestore:indexes`.

## Environment

Set the Firebase Admin vars (same as the web app) plus the worker tuning vars:

```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...        # newlines escaped as \n
SCAN_RENDER_PROFILE=real
WORKER_CONCURRENCY=2             # concurrent contexts; 2 on a 2GB instance is the baseline
WORKER_POLL_INTERVAL_MS=3000
WORKER_SCAN_TIMEOUT_MS=120000
WORKER_HEARTBEAT_MS=15000
WORKER_STALE_RUNNING_MS=45000
WORKER_STALE_RECLAIM_LIMIT=3
SWEEP_QUEUE_TIMEOUT_MS=1800000
WORKER_SHUTDOWN_DRAIN_MS=5000
WORKER_HEALTH_PORT=3001          # optional; Railway can use PORT instead
# Browser lifecycle / memory hardening:
WORKER_MAX_RSS_MB=1536              # recycle Chromium above this RSS
WORKER_BROWSER_RECYCLE_JOBS=50     # ...or after this many page jobs
WORKER_BROWSER_RELAUNCH_ATTEMPTS=3 # crash relaunches before going unhealthy + exit
WORKER_BROWSER_RELAUNCH_BASE_MS=500 # exponential backoff base between relaunches
# Optional visual evidence (also needs workspace consent):
VISUAL_EVIDENCE_ENABLED=true
VISUAL_EVIDENCE_STORAGE_ENABLED=true
```

## Build & run locally

```
docker build -f Dockerfile.worker -t percevia-worker .
docker run --rm --env-file .env.local percevia-worker
```

You should see `[worker] starting ...`. Create a scan from the app and watch it
go `queued → running → completed`.

If `PORT` or `WORKER_HEALTH_PORT` is set, the worker also serves
`GET /healthz` with the worker id, in-flight count, and shutdown status. This is
for container health checks only; scan dispatch still happens through Firestore
polling.

## Deploy (Railway / Fly.io / Render / Cloud Run)

The image is host-agnostic. Examples:

**Railway** — New Service → Deploy from repo → set Dockerfile path to
`Dockerfile.worker`, add the env vars above, deploy. Scale to ≥1 instance.

**Fly.io** — `fly launch --dockerfile Dockerfile.worker --no-deploy`, set secrets
with `fly secrets set FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=...`,
then `fly deploy`. Provision ~2 GB for the baseline `WORKER_CONCURRENCY=2`; bump
memory before raising concurrency (the single shared Chromium grows with the
number of concurrent contexts).

**Render** — New → Background Worker → Docker → `Dockerfile.worker`, add env, deploy.

## Operations

- **Scaling:** run multiple worker instances; the atomic claim guarantees each
  job is processed once. Each instance runs one shared Chromium with up to
  `WORKER_CONCURRENCY` concurrent contexts — prefer horizontal scaling (more
  instances) over raising concurrency on a single 2 GB box.
- **Graceful deploys:** the worker gives in-flight scans a bounded drain window
  on `SIGTERM`, closes the shared Chromium, then transactionally requeues
  anything unfinished before exit.
- **Crash recovery:** two independent layers. (1) Within a worker, a Chromium
  crash relaunches with backoff and the in-flight page job retries; exhausting
  the relaunch budget makes the worker exit nonzero for the platform to restart.
  (2) Across workers, an independent sweeper every 60 seconds requeues jobs whose
  heartbeat is older than 45 seconds, fails the third stale attempt with
  `worker_heartbeat_stale`, and fails queued jobs older than 30 minutes with
  `queue_timeout`.
- **Health:** the job's `processorHeartbeatAt` advances every
  `WORKER_HEARTBEAT_MS` while a scan runs. The container `/healthz` returns 503
  when the shared Chromium is unrecoverable (`browserHealthy: false`).
