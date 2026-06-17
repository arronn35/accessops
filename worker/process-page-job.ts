/**
 * Per-page job processor (Phase 3).
 *
 * Runs ONE pageJob: scan a single URL with a hard 60s deadline, persist that
 * page's results, and finalize the pageJob. The worker that completes the LAST
 * outstanding page of a scan wins the right to aggregate (scoring/grouping/
 * task-generation) and set the terminal scan state.
 *
 * A single hanging or broken page can only ever fail its own pageJob — never
 * the whole scan.
 */
import { scanSinglePage, createDeadline } from "@/lib/scanner/playwright-runner";
import { getBrowserManager } from "./browser-manager";
import { runStaticScanJob } from "@/lib/scanner/static-runner";
import { createEvidenceBudget } from "@/lib/scanner/visual-evidence";
import { aggregateScan, persistPageResult } from "@/lib/scanner/persistence";
import {
  completePageJob,
  failPageJob,
  touchPageJob,
  updateScanJob,
} from "@/lib/data/firestore";
import { PAGE_JOB_DEADLINE_MS } from "@/lib/data/page-jobs";
import { captureException } from "@/lib/observability";
import { logScanEvent, type WorkerLogLevel } from "./log";
import type { NormalizedPage } from "@/lib/scanner/types";
import type { PageJob, ScanJob } from "@/lib/data/types";

const PAGE_HEARTBEAT_MS = Math.max(
  5_000,
  Number(process.env.PAGE_JOB_HEARTBEAT_MS ?? 20_000)
);
/** Thrown when the hard per-page timeout fires (a page that ignores all budgets). */
export class PageDeadlineError extends Error {
  readonly code = "page_deadline_exceeded";
  constructor(deadlineMs = PAGE_JOB_DEADLINE_MS) {
    super(`Page scan exceeded its ${Math.round(deadlineMs / 1000)}s deadline.`);
    this.name = "PageDeadlineError";
  }
}

export interface ProcessPageJobDeps {
  runPageScan: (
    job: PageJob,
    scan: ScanJob,
    signal: AbortSignal
  ) => Promise<NormalizedPage>;
  persistPageResult: typeof persistPageResult;
  completePageJob: typeof completePageJob;
  failPageJob: typeof failPageJob;
  touchPageJob: typeof touchPageJob;
  updateScanJob: typeof updateScanJob;
  aggregateScan: typeof aggregateScan;
}

function defaultDeps(): ProcessPageJobDeps {
  return {
    runPageScan: defaultRunPageScan,
    persistPageResult,
    completePageJob,
    failPageJob,
    touchPageJob,
    updateScanJob,
    aggregateScan,
  };
}

function isBrowserLaunchFailure(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code === "browser_launch_failed") return true;
  const message = err instanceof Error ? err.message : String(err);
  return /browser launch failed/i.test(message);
}

/**
 * Scan one URL. Tries the real browser engine first; if Chromium cannot launch
 * in this environment, degrades to a static HTML scan for that page (mirrors
 * the legacy path's graceful degradation) rather than failing the page.
 */
export async function defaultRunPageScan(
  job: PageJob,
  scan: ScanJob,
  signal: AbortSignal
): Promise<NormalizedPage> {
  try {
    return await browserScanOnePage(job, scan, signal);
  } catch (err) {
    if (!isBrowserLaunchFailure(err)) throw err;
    const outcome = await runStaticScanJob({
      jobId: job.scanJobId,
      url: job.url,
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      visualEvidenceEnabled: false,
      visualEvidenceMaxScreenshots: 0,
      timeoutMs: job.deadlineMs ?? PAGE_JOB_DEADLINE_MS,
    });
    const page = outcome.pages[0];
    if (!page) throw err;
    return page;
  }
}

/**
 * Browser scan under both the engine's internal budget AND a hard outer
 * timeout (`runWithPageDeadline`). The hard timeout guarantees the pageJob fails
 * at ~60s even if the page (or axe) ignores every internal budget.
 *
 * Phase 4: we no longer launch a Chromium per page. We borrow the worker's
 * shared browser via the BrowserManager and open a fresh, isolated context per
 * viewport inside `scanSinglePage` (which closes them in its own finally). The
 * lease is released here so the manager can check RSS / recycle between jobs. On
 * abort we do NOT close the shared browser — navigation/action timeouts are
 * derived from the page deadline, so a hung page unwinds on its own (its context
 * is then torn down by scanSinglePage), and a true crash is handled by the
 * manager's disconnect → relaunch path.
 */
async function browserScanOnePage(
  job: PageJob,
  scan: ScanJob,
  signal: AbortSignal
): Promise<NormalizedPage> {
  const lease = await getBrowserManager().acquire();
  try {
    if (signal.aborted) throw new PageDeadlineError(job.deadlineMs);
    return await scanSinglePage(lease.browser, job.url, {
      includeScreenshots: scan.includeScreenshots,
      visualEvidenceEnabled: scan.storeScreenshots,
      evidenceBudget: scan.storeScreenshots
        ? createEvidenceBudget(scan.visualEvidenceMaxScreenshots ?? 0)
        : undefined,
      deadline: createDeadline(job.deadlineMs ?? PAGE_JOB_DEADLINE_MS),
      signal,
    });
  } finally {
    lease.release();
  }
}

export async function runWithPageDeadline(
  job: PageJob,
  scan: ScanJob,
  run: ProcessPageJobDeps["runPageScan"]
): Promise<NormalizedPage> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scanPromise = run(job, scan, controller.signal);
  scanPromise.catch(() => undefined);
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new PageDeadlineError(job.deadlineMs));
    }, job.deadlineMs ?? PAGE_JOB_DEADLINE_MS);
  });
  try {
    return await Promise.race([scanPromise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Process one already-claimed pageJob to a terminal state. Never throws —
 * failures are recorded on the pageJob so the worker loop keeps running.
 */
export async function processPageJob(
  job: PageJob,
  scan: ScanJob,
  overrides: Partial<ProcessPageJobDeps> = {}
): Promise<void> {
  const deps = { ...defaultDeps(), ...overrides };
  const workerId = job.claimedBy;
  const log = (level: WorkerLogLevel, event: string, details: Record<string, unknown> = {}) =>
    logScanEvent(level, event, {
      scanId: job.scanJobId,
      workspaceId: job.workspaceId,
      pageJobId: job.id,
      url: job.url,
      ...details,
    });

  if (!workerId) {
    log("error", "page-job-owner-missing");
    return;
  }

  const heartbeat = setInterval(() => {
    void deps
      .touchPageJob(job.workspaceId, job.scanJobId, job.id, workerId)
      .catch(() => undefined);
  }, PAGE_HEARTBEAT_MS);

  async function runAggregation(): Promise<void> {
    log("info", "aggregate-start");
    const beat = () =>
      deps.updateScanJob(job.workspaceId, job.scanJobId, {
        processorHeartbeatAt: new Date(),
        claimedBy: workerId,
      });
    await beat();
    const aggregationHeartbeat = setInterval(() => {
      void beat().catch(() => undefined);
    }, PAGE_HEARTBEAT_MS);
    try {
      const res = await deps.aggregateScan(job.scanJobId, {
        workspaceId: job.workspaceId,
        userId: scan.requestedBy,
      });
      log("info", "aggregate-complete", {
        phase: res.phase,
        pagesDone: res.pagesDone,
        pagesFailed: res.pagesFailed,
      });
    } catch (err) {
      // Leave phase=aggregating; the sweeper re-triggers aggregation.
      log("error", "aggregate-fail", { message: (err as Error).message });
      void captureException(err, {
        scope: "aggregate",
        scanId: job.scanJobId,
        workspaceId: job.workspaceId,
      });
    } finally {
      clearInterval(aggregationHeartbeat);
    }
  }

  try {
    log("info", "page-job-start", { attempts: job.attempts });
    let page: NormalizedPage;
    try {
      page = await runWithPageDeadline(job, scan, deps.runPageScan);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "page_scan_failed";
      const msg = (err as Error).message || code;
      const { requeued, aggregationWon } = await deps.failPageJob(
        job.workspaceId,
        job.scanJobId,
        job.id,
        msg,
        code,
        workerId
      );
      log(requeued ? "warn" : "error", requeued ? "page-job-requeue" : "page-job-fail", {
        errorCode: code,
        requeued,
      });
      if (!requeued && code !== "page_deadline_exceeded" && !msg.startsWith("URL validation")) {
        void captureException(err, {
          scope: "page-job",
          scanId: job.scanJobId,
          workspaceId: job.workspaceId,
        });
      }
      if (aggregationWon) await runAggregation();
      return;
    }

    await deps.persistPageResult(job.scanJobId, page, {
      workspaceId: job.workspaceId,
      storeScreenshots: scan.storeScreenshots,
      pageJobId: job.id,
    });
    const { aggregationWon } = await deps.completePageJob(
      job.workspaceId,
      job.scanJobId,
      job.id,
      workerId
    );
    log("info", "page-job-complete", { issues: page.issues.length });
    if (aggregationWon) await runAggregation();
  } finally {
    clearInterval(heartbeat);
  }
}
