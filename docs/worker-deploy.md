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
infrastructure. Concurrency is bounded by `WORKER_CONCURRENCY`; a crashed worker's
in-flight jobs are reclaimed automatically once their heartbeat goes stale
(`WORKER_STALE_RUNNING_MS`).

## Required Firestore indexes

The poll uses collection-group queries on `scans`. Create these once (the first
run also prints a console link that builds them for you):

- `scans` (collection group): `status` ASC, `createdAt` ASC
- `scans` (collection group): `status` ASC, `processorHeartbeatAt` ASC

Or via `firestore.indexes.json` + `firebase deploy --only firestore:indexes`.

## Environment

Set the Firebase Admin vars (same as the web app) plus the worker tuning vars:

```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...        # newlines escaped as \n
SCAN_RENDER_PROFILE=real
WORKER_CONCURRENCY=2
WORKER_POLL_INTERVAL_MS=3000
WORKER_SCAN_TIMEOUT_MS=120000
WORKER_HEARTBEAT_MS=15000
WORKER_STALE_RUNNING_MS=180000
WORKER_HEALTH_PORT=3001          # optional; Railway can use PORT instead
# Optional visual evidence (also needs workspace consent):
VISUAL_EVIDENCE_ENABLED=true
VISUAL_EVIDENCE_STORAGE_ENABLED=true
```

## Build & run locally

```
docker build -f Dockerfile.worker -t accessops-worker .
docker run --rm --env-file .env.local accessops-worker
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
then `fly deploy`. A single shared-cpu-1x/512MB machine handles
`WORKER_CONCURRENCY=2`; bump memory for higher concurrency (each scan launches
its own Chromium).

**Render** — New → Background Worker → Docker → `Dockerfile.worker`, add env, deploy.

## Operations

- **Scaling:** run multiple worker instances; the atomic claim guarantees each
  job is processed once. Raise `WORKER_CONCURRENCY` for vertical scaling (watch
  memory: ~1 Chromium per concurrent job).
- **Graceful deploys:** the worker drains in-flight jobs on `SIGTERM` before
  exiting; jobs not finished in the platform's grace window are reclaimed by the
  next worker via stale-heartbeat recovery.
- **Health:** the job's `processorHeartbeatAt` advances every
  `WORKER_HEARTBEAT_MS` while a scan runs.
