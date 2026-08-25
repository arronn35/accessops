# Browser scan worker — deployment

The worker is the production scan engine: it claims `queued` scan jobs and runs
the real Playwright + axe-core scanner. The Vercel web app only creates jobs; it
never runs Chromium.

There are **two dispatch models**, selected by `SCAN_DISPATCH_MODE`:

| Mode | Entrypoint | Host | Cost | Use |
|---|---|---|---|---|
| `cloud-tasks` (recommended) | `worker/serve.ts` | Cloud Run (scale-to-zero) | pay-per-scan (~$0 at low volume) | production |
| `poll` (legacy) | `worker/index.ts` | any always-on container | fixed monthly | local / always-on |

## Architecture — `cloud-tasks` (push, scale-to-zero)

```
Browser → POST /api/scans (Vercel) → Firestore scans/{id} status="queued"
                                   └→ Cloud Tasks enqueue (POST /process)
                                          │  durable delivery + retries
                Cloud Run worker (Playwright image, serve.ts) wakes from zero
                atomic claim → real axe scan → persist + complete → aggregate
                                          │  scales back to zero when idle
Cloud Scheduler (1–2 min) → POST /api/internal/scans/sweep (Vercel, no Chromium)
                requeues stale/crashed jobs, fails timeouts, re-enqueues a task
```

`POST /api/scans` writes the `queued` job and enqueues a Cloud Task; the task
wakes the Cloud Run worker, which **drains all claimable work** (scans, page
jobs, one deletion job) then aggregates and returns. The enqueue is best-effort:
if it fails the job stays `queued` and the **sweeper** re-enqueues it, so a scan
is never stranded. Correctness across overlapping invocations is guaranteed by
the same atomic Firestore claims the poller uses — every job runs at most once.

The sweeper is browser-free Firestore bookkeeping: it requeues jobs whose
heartbeat is older than `WORKER_STALE_RUNNING_MS`, fails repeatedly-stale and
timed-out jobs, aggregates finished scans, and wakes the worker for any pending
work. Running it on a Cloud Scheduler cron (not in-process) is what lets the
heavy container scale to zero.

## Architecture — `poll` (legacy, always-on)

```
Browser → POST /api/scans (Vercel) → Firestore scans/{id} status="queued"
                                          │  poll + atomic claim
                Worker container (Playwright image, index.ts) → runScanJob()
```

Dispatch is Firestore polling — no queue infrastructure, and an in-process
60-second sweeper handles recovery. Set `SCAN_DISPATCH_MODE=poll` (or leave it
unset) and run `worker/index.ts`. Override the Docker `CMD` to `tsx worker/index.ts`.

## Browser lifecycle & memory

The worker launches **one Chromium per process** at first use and opens an
isolated `browser.newContext()` per page job (one context per page in legacy
whole-scan mode). Contexts are always closed in a `finally`; the browser is
long-lived. This is what keeps a 2 GB instance stable — there is no full browser
launch per job.

- **Supported baseline: two concurrent contexts on a 2 GB instance (Cloud Run
  `--memory 2Gi`).** Since scans now run several pages in parallel, the context
  count is capped directly by `SCAN_MAX_CONCURRENT_CONTEXTS` (default 2) rather
  than implied by `WORKER_CONCURRENCY`. That single number is the one to match
  against RAM; budget roughly **1 GB per concurrent context** including the
  browser and Node itself.
  - `WORKER_CONCURRENCY` — how many *jobs* the worker claims at once.
  - `SCAN_PAGE_CONCURRENCY` — how many *pages* one scan runs at once.
  - `SCAN_MAX_CONCURRENT_CONTEXTS` — the ceiling both of the above queue on.

  Raising either of the first two without raising the ceiling changes
  throughput shape, never peak memory. Watch `contexts.queued` on `/health`:
  persistently above zero means work is waiting on the ceiling.
- **Crash recovery:** the worker listens for Chromium's `disconnected` event. A
  crash marks the in-flight page job for retry (it requeues via the normal
  page-job retry path) and relaunches Chromium with exponential backoff (up to
  `WORKER_BROWSER_RELAUNCH_ATTEMPTS`, default 3). If every relaunch fails, the
  worker reports unhealthy on `/health` (503) and exits nonzero so the platform
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
- `scans.status` single-field indexes: ASC/DESC for both normal collection
  queries and collection-group queries
Or via `firestore.indexes.json` + `firebase deploy --only firestore:indexes`.

## Environment

Cloud Run uses its runtime service account as Firebase Admin Application
Default Credentials. Grant that account `roles/datastore.user`; do not copy the
Vercel Firebase private key into Cloud Run.

```
FIREBASE_PROJECT_ID=...
SCAN_RENDER_PROFILE=real
WORKER_CONCURRENCY=2             # concurrent contexts; 2 on a 2GB instance is the baseline
WORKER_POLL_INTERVAL_MS=3000
WORKER_SCAN_TIMEOUT_MS=120000
WORKER_HEARTBEAT_MS=15000
WORKER_STALE_RUNNING_MS=45000
WORKER_STALE_RECLAIM_LIMIT=3
SWEEP_QUEUE_TIMEOUT_MS=1800000
WORKER_SHUTDOWN_DRAIN_MS=5000   # poll mode only
WORKER_PROCESS_BUDGET_MS=240000 # serve mode: budget per POST /process; keep < Cloud Run --timeout
# Cloud Run provides PORT; serve.ts listens on it (default 8080).
# Browser lifecycle / memory hardening:
WORKER_MAX_RSS_MB=1536              # recycle Chromium above this RSS
WORKER_BROWSER_RECYCLE_JOBS=50     # ...or after this many page jobs
WORKER_BROWSER_RELAUNCH_ATTEMPTS=3 # crash relaunches before going unhealthy + exit
WORKER_BROWSER_RELAUNCH_BASE_MS=500 # exponential backoff base between relaunches
# serve mode: shared secret the worker requires on POST /process (must match
# the value Vercel uses to enqueue Cloud Tasks).
INTERNAL_WORKER_SECRET=...
# Optional visual evidence (also needs workspace consent):
VISUAL_EVIDENCE_ENABLED=true
VISUAL_EVIDENCE_STORAGE_ENABLED=true
```

The **Vercel web app** (not the worker) holds the dispatch config:
`SCAN_DISPATCH_MODE=cloud-tasks`, `GCP_PROJECT_ID`, `CLOUD_TASKS_LOCATION`,
`CLOUD_TASKS_QUEUE`, `SCAN_WORKER_URL`, `INTERNAL_WORKER_SECRET`, `CRON_SECRET`
and `CLOUD_TASKS_OIDC_SERVICE_ACCOUNT`. See `.env.example`.

## Build & run locally

```
docker build -f Dockerfile.worker -t percevia-worker .

# serve mode (default CMD): HTTP server on :8080
docker run --rm -p 8080:8080 --env-file .env.local percevia-worker
# trigger a drain by hand:
curl -XPOST localhost:8080/process -H "x-internal-worker-secret: $INTERNAL_WORKER_SECRET"
curl localhost:8080/health

# poll mode: override the command
docker run --rm --env-file .env.local percevia-worker npx tsx worker/index.ts
```

In serve mode you should see `[serve] listening on :8080`. Create a scan from the
app (with `SCAN_DISPATCH_MODE=cloud-tasks` it is enqueued automatically; locally
you can hit `/process` directly) and watch it go `queued → running → completed`.
`GET /health` returns 503 once the shared Chromium is unrecoverable so Cloud Run
recycles the instance.

## Deploy — Cloud Run + Cloud Tasks + Cloud Scheduler (recommended)

Everything lives in the **same Google Cloud project as Firebase**.
`scripts/deploy-cloud-run.sh` builds the explicitly named `Dockerfile.worker`,
creates dedicated runtime/invoker identities and grants least-privilege IAM.
Run it after `gcloud auth login`.

```bash
PROJECT=your-firebase-project
# Region MUST match your Firestore location (the worker is Firestore-chatty;
# cross-region adds latency + egress cost). The product is "EU-hosted by
# default", so europe-west1 (Belgium) is the recommended default — it is also
# where Firestore's `eur3` EU multi-region lives. Confirm yours in
# Firebase Console → Firestore → Location and match it (e.g. europe-west3 for
# Frankfurt). Cloud Tasks + Cloud Scheduler must use the same region.
REGION=europe-west1
TASK_CREATOR_SERVICE_ACCOUNT=<firebase-admin-service-account-used-by-vercel>
INTERNAL_WORKER_SECRET=<strong-random-secret>
CRON_SECRET=<strong-random-secret>
VERCEL_APP_URL=https://<your-app>

./scripts/deploy-cloud-run.sh
```

The script prints the exact Vercel variables to set, including the generated
Cloud Run URL and OIDC invoker identity. Set them and redeploy the web app.

The worker stays private behind Cloud Run IAM and also requires the 256-bit
`INTERNAL_WORKER_SECRET` on `POST /process`. Use `/health` rather than
`/healthz`: Cloud Run reserves some paths ending in `z` and can intercept them
before they reach the container.

**Cost:** at low volume the worker stays at zero and fits the Cloud Run free
tier — effectively $0/mo. You pay only for compute while scans run.

**Cold start:** the Playwright image is large, so the first scan after idle
waits ~10–30 s for the container to start. Scans are async (queued), so this is
not user-blocking. Raise `--min-instances 1` to remove cold starts at the cost
of a fixed always-on charge.

### Legacy poll deploy (any always-on host)

Set `SCAN_DISPATCH_MODE=poll`, override the container command to
`tsx worker/index.ts`, provision ~2 GB, and run ≥1 instance. No Cloud Tasks or
Scheduler needed (the in-process sweeper handles recovery).

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
  `WORKER_HEARTBEAT_MS` while a scan runs. The container `/health` returns 503
  when the shared Chromium is unrecoverable (`browserHealthy: false`).
