# maitrico AccessOps AI

Privacy-first accessibility operations SaaS. AccessOps AI helps teams run bounded static accessibility scans, review issues, and export reports with clear limitations. It does not promise legal compliance or certification.

## Current Architecture

| Layer | Service |
|---|---|
| Web hosting | Vercel + Next.js App Router |
| Auth | Firebase Auth, email link + GitHub provider |
| Data | Firebase Firestore via Firebase Admin SDK |
| Dispatch | Firestore polling (`queued` scan jobs) |
| Scan processor | Dedicated browser worker container running Playwright + axe-core |
| Storage | No external screenshot/PDF storage in V1 |

## Local Setup

```bash
npm install
npm run secrets:decrypt   # writes .env.local (see docs/secrets.md)
npm run dev
```

Required local env for signed-in app flows:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_SESSION_COOKIE_NAME=accessops_session`
- `FIREBASE_SESSION_DAYS=7`

Browser worker processing requires:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SCAN_RENDER_PROFILE=real`

## Scan Flow

1. `POST /api/scans` validates the URL, checks workspace membership, enforces quota, and creates a Firestore scan job with `status: "queued"`.
2. The dedicated browser worker polls Firestore, atomically claims queued jobs, and flips them to `running`.
3. The worker runs the Playwright + axe-core scanner and persists pages, grouped issues, and summaries in Firestore.
4. The progress UI polls `GET /api/scans/:id/status` until the job moves `queued -> running -> completed`.

The deprecated internal static processor is retained only as a guarded fallback. The production scan path is the browser worker.

## Free Quota Guard

Defaults are conservative so provider quota is not the first failure point:

- Global free cap: `FREE_GLOBAL_SCANS_PER_DAY=50`
- Free workspace cap: `SCAN_DAILY_CAP_FREE=3`
- Free pages per scan: `SCAN_MAX_PAGES_FREE=3`
- Persisted issues per scan: `MAX_PERSISTED_ISSUES_PER_SCAN=100`

When caps are reached, APIs return user-friendly daily capacity messages.

## Deploy

Web app:

```bash
vercel --prod
```

Firestore indexes:

```bash
firebase deploy --only firestore:indexes
```

Browser scan worker:

```bash
docker build -f Dockerfile.worker -t accessops-worker .
docker run --rm --env-file .env.local -e WORKER_HEALTH_PORT=3001 accessops-worker
```

Deploy `Dockerfile.worker` to Railway, Fly.io, Render, or Cloud Run and scale to at least one instance. See `docs/worker-deploy.md`.

## Verification

Useful checks:

```bash
npm run lint
npm run typecheck
npm run worker:typecheck
npm test
npm run test:e2e   # public lanes; add E2E_FIREBASE_* staging secrets for the authenticated lane
curl -sS https://your-app.vercel.app/api/healthz
curl -sS https://your-app.vercel.app/api/healthz?deep=1
```

Smoke expectations:

- `/api/healthz` returns `ok: true`.
- `/api/healthz?deep=1` reports Firestore readiness plus a sanitized scan-worker
  heartbeat check (`checks.worker`, `degraded: true` when no worker beat recently).
- The worker `/healthz` endpoint returns `ok: true` when `PORT` or `WORKER_HEALTH_PORT` is set.
- A new scan appears as `queued`, then the worker logs `claimed <scanId>` and the UI moves to `running`.
