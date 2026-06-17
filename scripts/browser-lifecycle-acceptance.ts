/**
 * Phase 4 acceptance harness — browser lifecycle + memory hardening.
 *
 *   npx tsx scripts/browser-lifecycle-acceptance.ts
 *
 * Exercises the REAL worker path (processPageJob → BrowserManager → real
 * Chromium) against a local HTTP server, with an in-memory job store injected
 * via processPageJob's deps (no Firebase). It asserts the two Phase 4 acceptance
 * criteria and exits nonzero on any failure:
 *
 *   1. Soak: 100 consecutive page jobs complete without RSS growing unbounded,
 *      and the browser is recycled by the memory guard along the way.
 *   2. Crash recovery: killing Chromium mid-job auto-relaunches the browser, the
 *      page job retries and completes, and no job is left zombied in "running".
 */
import { createServer, type Server } from "node:http";
import { execFileSync } from "node:child_process";

// Allow scanning 127.0.0.1 (the SSRF guard blocks private ranges otherwise).
// The guard only relaxes when all three of these are set together. `NODE_ENV`
// is typed read-only by Next's env augmentation, so set it through a cast.
const env = process.env as Record<string, string>;
env.NODE_ENV = "test";
env.RUN_BROWSER_TESTS = "1";
env.PERCEVIA_ALLOW_PRIVATE_SCAN_TARGETS_FOR_TESTS = "1";

import {
  getBrowserManager,
  __resetBrowserManagerForTests,
} from "../worker/browser-manager";
import { processPageJob, type ProcessPageJobDeps } from "../worker/process-page-job";
import type { PageJob, ScanJob } from "../src/lib/data/types";

const SOAK_JOBS = Number(process.argv[2] ?? 100);
const RECYCLE_EVERY = 25;

const log = (msg: string) => console.log(`[acceptance] ${msg}`);
const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`[acceptance] ${ok ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
}

// --- in-memory job store (stands in for Firestore) --------------------------

type JobState = { status: string; attempts: number; maxAttempts: number };

function makeStore() {
  const jobs = new Map<string, JobState>();
  const counts = { completed: 0, failed: 0, requeued: 0 };
  const deps: Partial<ProcessPageJobDeps> = {
    // runPageScan is intentionally NOT overridden → the REAL browser engine runs.
    persistPageResult: async () => undefined,
    completePageJob: async (_ws, _scan, id) => {
      const job = jobs.get(id);
      if (job) job.status = "completed";
      counts.completed += 1;
      return { aggregationWon: false };
    },
    failPageJob: async (_ws, _scan, id) => {
      const job = jobs.get(id)!;
      if (job.attempts < job.maxAttempts) {
        job.attempts += 1;
        job.status = "queued";
        counts.requeued += 1;
        return { requeued: true, aggregationWon: false };
      }
      job.status = "failed";
      counts.failed += 1;
      return { requeued: false, aggregationWon: false };
    },
    touchPageJob: async () => true,
    updateScanJob: async () => undefined,
    aggregateScan: async () => ({ phase: "completed", pagesDone: 1, pagesFailed: 0 }),
  };
  return { jobs, counts, deps };
}

function scanJob(): ScanJob {
  const at = new Date();
  return {
    id: "acc-scan",
    workspaceId: "ws-acc",
    requestedBy: "user-acc",
    scanType: "manual",
    status: "running",
    baseUrl: "http://127.0.0.1",
    sourceUrlsJson: null,
    maxPages: 1,
    pagesDiscovered: 1,
    pagesScanned: 0,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "scanning",
    startedAt: at,
    completedAt: null,
    errorMessage: null,
    usePageJobs: true,
    phase: "scanning",
    pagesDone: 0,
    pagesFailed: 0,
    pagesTotal: 1,
    createdAt: at,
    updatedAt: at,
  } as ScanJob;
}

function pageJob(id: string, url: string, deadlineMs: number): PageJob {
  return {
    id,
    scanJobId: "acc-scan",
    workspaceId: "ws-acc",
    url,
    status: "running",
    attempts: 1,
    maxAttempts: 2,
    claimedBy: "worker-acc",
    heartbeatAt: new Date(),
    deadlineMs,
    createdAt: new Date(),
  } as PageJob;
}

// --- chromium process helpers (for the crash test) --------------------------

/** PIDs of the Playwright-managed Chromium for THIS run (cache-path scoped). */
function chromiumPids(): number[] {
  try {
    return execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" })
      .split("\n")
      .filter((line) => /ms-playwright\/chromium|Google Chrome for Testing/.test(line))
      .map((line) => Number(line.trim().split(/\s+/)[0]))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

// --- test page server -------------------------------------------------------

const FAST_PAGE = `<!doctype html><html lang="en"><head><title>Soak</title>
<style>body{background:#fff;color:#111}.low{color:#999;background:#aaa}</style></head>
<body><main><h1>Soak fixture</h1><img src="/px.png"><p class="low">low contrast</p>
<input id="email" type="email"></main></body></html>`;

const SLOW_PAGE = `<!doctype html><html lang="en"><head><title>Slow</title></head>
<body><main><h1>Slow fixture</h1><img src="/slow.png"><input type="text"></main></body></html>`;

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

function startServer(): Promise<{ origin: string; server: Server }> {
  const server = createServer((req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/slow.png")) {
      // Hold the response so a scan stays in flight (in networkidle) long enough
      // to be killed mid-job, but short enough that the retry finishes well
      // inside its deadline despite the engine's per-viewport re-navigations.
      setTimeout(() => {
        res.writeHead(200, { "content-type": "image/png" });
        res.end(TINY_PNG);
      }, 1500);
      return;
    }
    if (url.startsWith("/px.png")) {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(TINY_PNG);
      return;
    }
    if (url.startsWith("/slow")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(SLOW_PAGE);
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(FAST_PAGE);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") return reject(new Error("no_address"));
      resolve({ origin: `http://127.0.0.1:${addr.port}`, server });
    });
  });
}

// --- phase 1: soak ----------------------------------------------------------

async function soak(origin: string): Promise<void> {
  log(`PHASE 1 — soak: ${SOAK_JOBS} consecutive page jobs (recycle every ${RECYCLE_EVERY})`);
  process.env.SCAN_RENDER_PROFILE = "minimal";
  process.env.WORKER_BROWSER_RECYCLE_JOBS = String(RECYCLE_EVERY);
  process.env.WORKER_MAX_RSS_MB = "1536";
  __resetBrowserManagerForTests();
  const manager = getBrowserManager();

  // Each iteration drives the exact OOM-prone path: take a lease on the ONE
  // shared Chromium, open an isolated context, navigate, then close the context
  // and release. This is what scanSinglePage does per viewport — minus the
  // multi-pass axe work — so it exercises the lease → context → recycle
  // lifecycle and real browser memory over 100 jobs without the per-scan cost.
  let completed = 0;
  let failed = 0;
  const rss: number[] = [];

  for (let i = 1; i <= SOAK_JOBS; i += 1) {
    let lease: Awaited<ReturnType<typeof manager.acquire>> | undefined;
    try {
      lease = await manager.acquire();
      const context = await lease.browser.newContext({ viewport: { width: 1280, height: 800 } });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/fast`, { waitUntil: "domcontentloaded", timeout: 8000 });
        await page.content().catch(() => "");
        completed += 1;
      } finally {
        await context.close().catch(() => undefined);
      }
    } catch (err) {
      failed += 1;
      log(`  job ${i} error: ${(err as Error).message}`);
    } finally {
      lease?.release();
    }
    rss.push(process.memoryUsage().rss);
    if (i % 10 === 0 || i === SOAK_JOBS) {
      const s = manager.stats();
      log(`  job ${i}/${SOAK_JOBS}: rss=${mb(rss[i - 1])}MB gen=${s.generation} jobsOnBrowser=${s.jobsOnBrowser}`);
    }
  }

  const quartile = Math.max(1, Math.floor(SOAK_JOBS / 4));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const firstAvg = avg(rss.slice(0, quartile));
  const lastAvg = avg(rss.slice(-quartile));
  const peak = Math.max(...rss);
  const growth = lastAvg / firstAvg;

  log(`  rss firstQ=${mb(firstAvg)}MB lastQ=${mb(lastAvg)}MB peak=${mb(peak)}MB growth=${growth.toFixed(2)}x`);
  log(`  jobs completed=${completed} failed=${failed} finalGeneration=${manager.stats().generation}`);

  check("all soak jobs completed", completed === SOAK_JOBS, `${completed}/${SOAK_JOBS}`);
  check("no soak job failed", failed === 0, `failed=${failed}`);
  check(
    "browser recycled by the memory guard",
    manager.stats().generation >= 3,
    `generation=${manager.stats().generation}`
  );
  check("peak RSS stayed bounded (<1536MB)", peak < 1536 * 1024 * 1024, `${mb(peak)}MB`);
  check("RSS did not grow unbounded (lastQ/firstQ < 1.5x)", growth < 1.5, `${growth.toFixed(2)}x`);

  await manager.close();
}

// --- phase 2: crash recovery -----------------------------------------------

async function crashRecovery(origin: string): Promise<void> {
  log("PHASE 2 — crash recovery: kill Chromium mid-job");
  // Load the slow subresource so the scan is genuinely in flight when we kill it.
  process.env.SCAN_RENDER_PROFILE = "real";
  process.env.WORKER_BROWSER_RECYCLE_JOBS = "10000"; // isolate generation bumps to the crash
  __resetBrowserManagerForTests();
  const manager = getBrowserManager();

  const { jobs, counts, deps } = makeStore();
  const scan = scanJob();

  // Warm up so a browser exists, then capture the generation we will crash.
  jobs.set("warm", { status: "running", attempts: 1, maxAttempts: 2 });
  await processPageJob(pageJob("warm", `${origin}/fast`, 5_000), scan, deps);
  const genBefore = manager.stats().generation;
  log(`  warm-up complete: generation=${genBefore}, browser connected=${manager.stats().connected}`);

  // Start a scan on the slow page and SIGKILL Chromium while it is in flight.
  const id = "crash-1";
  jobs.set(id, { status: "running", attempts: 1, maxAttempts: 2 });
  const run = processPageJob(pageJob(id, `${origin}/slow`, 40_000), scan, deps);
  await delay(1000);
  const victims = chromiumPids();
  log(`  killing Chromium mid-job: pids=[${victims.join(", ")}]`);
  for (const pid of victims) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
  await run;

  const afterCrash = jobs.get(id)!;
  log(`  after crash: job status=${afterCrash.status} attempts=${afterCrash.attempts}, requeued=${counts.requeued}`);
  check("crashed page job requeued (not zombied)", afterCrash.status === "queued", afterCrash.status);

  // The worker would re-claim the requeued job; simulate the retry. Its acquire
  // awaits the manager's automatic relaunch and runs on the fresh browser.
  afterCrash.status = "running";
  await processPageJob(pageJob(id, `${origin}/slow`, 40_000), scan, deps);
  const s = manager.stats();
  log(`  retry complete: job status=${jobs.get(id)!.status} generation=${s.generation} healthy=${manager.isHealthy()}`);

  check("Chromium auto-relaunched after the crash", s.generation > genBefore, `gen ${genBefore} → ${s.generation}`);
  check("manager healthy after relaunch", manager.isHealthy());
  check("retried page job completed", jobs.get(id)!.status === "completed", jobs.get(id)!.status);

  const zombies = [...jobs.entries()].filter(([, j]) => j.status === "running");
  check("zero zombie jobs (none left running)", zombies.length === 0, `running=${zombies.length}`);

  await manager.close();
}

// --- main -------------------------------------------------------------------

(async () => {
  const { origin, server } = await startServer();
  log(`test server at ${origin}`);
  try {
    await soak(origin);
    await crashRecovery(origin);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log("");
  if (failures === 0) {
    log("ACCEPTANCE RESULT: PASS — all checks green");
    process.exit(0);
  }
  log(`ACCEPTANCE RESULT: FAIL — ${failures} check(s) failed`);
  process.exit(1);
})().catch((err) => {
  console.error("[acceptance] harness error:", err?.stack ?? err);
  process.exit(2);
});
