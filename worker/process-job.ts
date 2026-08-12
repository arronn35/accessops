/**
 * Worker job processing — the bridge between a claimed ScanJob row and the
 * real Playwright + axe-core engine.
 *
 * This is deliberately dependency-injectable so the lifecycle (success,
 * browser-launch fallback, failure) can be unit-tested without Firebase or a
 * real browser. The runtime loop in `index.ts` calls it with the real deps.
 */
import {
  resolveScanTargets as resolveScanTargetsEngine,
  runScanJob as runScanJobEngine,
} from "@/lib/scanner";
import { getBrowserManager } from "./browser-manager";
import { runStaticScanJob } from "@/lib/scanner/static-runner";
import {
  completeScanJob,
  markScanFailed,
  persistScanOutcome,
} from "@/lib/scanner/persistence";
import { createPageJobs, updateScanJob } from "@/lib/data/firestore";
import { captureException } from "@/lib/observability";
import { logScanEvent, type WorkerLogLevel } from "./log";
import {
  annotateStaticFallbackOutcome,
  staticFallbackReason,
  staticFallbackReasonFromOutcome,
} from "./static-fallback";
import type { ProgressUpdate, ScanInput, ScanOutcome } from "@/lib/scanner/types";
import type { ScanJob, ScanTimings } from "@/lib/data/types";

export interface ProcessJobDeps {
  runScanJob: typeof runScanJobEngine;
  runStaticScanJob: typeof runStaticScanJob;
  persistScanOutcome: typeof persistScanOutcome;
  completeScanJob: typeof completeScanJob;
  markScanFailed: typeof markScanFailed;
  updateScanJob: typeof updateScanJob;
  resolveScanTargets: typeof resolveScanTargetsEngine;
  createPageJobs: typeof createPageJobs;
}

/**
 * Legacy whole-scan crawl on the worker's shared Chromium (Phase 4): one browser
 * per process, one context per page inside the crawl. A cold-launch failure
 * surfaces as `browser_launch_failed` so `processScanJob` degrades to the static
 * scan, exactly as before.
 */
async function defaultRunScanJob(
  input: ScanInput,
  onProgress?: Parameters<typeof runScanJobEngine>[1]
): Promise<ScanOutcome> {
  const lease = await getBrowserManager().acquire();
  try {
    return await runScanJobEngine(input, onProgress, { browser: lease.browser });
  } finally {
    lease.release();
  }
}

/**
 * Resolve scan targets for the per-page model. Multi-page discovery reuses the
 * shared browser; single/manual/sitemap need none. If Chromium cannot start we
 * fall back to the deterministic source plan rather than launching per scan.
 */
async function defaultResolveScanTargets(
  input: ScanInput,
  budgetMs?: number
): Promise<string[]> {
  if (input.scanType !== "multi") {
    return resolveScanTargetsEngine(input, budgetMs);
  }
  let lease;
  try {
    lease = await getBrowserManager().acquire();
  } catch (err) {
    if (isBrowserLaunchFailure(err)) return resolveScanTargetsEngine(input, budgetMs);
    throw err;
  }
  try {
    return await resolveScanTargetsEngine(input, budgetMs, { browser: lease.browser });
  } finally {
    lease.release();
  }
}

function defaultDeps(): ProcessJobDeps {
  return {
    runScanJob: defaultRunScanJob,
    runStaticScanJob,
    persistScanOutcome,
    completeScanJob,
    markScanFailed,
    updateScanJob,
    resolveScanTargets: defaultResolveScanTargets,
    createPageJobs,
  };
}

/**
 * Per-job scan deadline. Generous because the worker is a long-running
 * container, not a 60s serverless function — enough for multi-page crawls
 * across three viewports.
 */
export const WORKER_SCAN_TIMEOUT_MS = Math.max(
  30_000,
  Number(process.env.WORKER_SCAN_TIMEOUT_MS ?? 120_000)
);

export const CRAWL_RESOLUTION_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.CRAWL_RESOLUTION_TIMEOUT_MS ?? 60_000)
);

/**
 * Absolute wall-clock ceiling for one legacy (monolithic) scan, independent of
 * the engine's own cooperative deadline. This is the worker's last line of
 * defense: if any Playwright/axe call ever hangs past the cooperative budget
 * (`WORKER_SCAN_TIMEOUT_MS`), this fires so the job is failed, its heartbeat
 * stops, and the concurrency slot is freed — instead of the scan sitting "in
 * progress" forever and, once every slot is stuck, starving the queue so new
 * scans never leave "queued". The grace is added on top of the engine deadline
 * so it only ever triggers on a genuine hang, never on a healthy slow scan.
 */
export const WORKER_SCAN_HARD_TIMEOUT_MS = Math.max(
  WORKER_SCAN_TIMEOUT_MS + 30_000,
  Number(
    process.env.WORKER_SCAN_HARD_TIMEOUT_MS ?? WORKER_SCAN_TIMEOUT_MS + 30_000
  )
);

const STATIC_FALLBACK_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.STATIC_FALLBACK_TIMEOUT_MS ?? 60_000)
);

/**
 * Race a scan-producing promise against a hard wall-clock deadline. On timeout
 * it rejects with `scan_timeout` (handled by processScanJob's failure path).
 * The underlying scan promise is left to unwind on its own — every Playwright
 * call inside it is independently time-bounded — so no operation outlives this
 * ceiling and holds the worker slot.
 */
async function withHardScanDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  // Avoid an unhandledRejection if the deadline wins the race.
  work.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("scan_timeout")), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function scanInputForJob(job: ScanJob): ScanInput {
  return {
    jobId: job.id,
    url: job.baseUrl,
    sourceUrls: job.sourceUrlsJson?.urls,
    sitemapUrl: job.sourceUrlsJson?.sitemapUrl ?? null,
    maxPages: job.maxPages,
    scanType: job.scanType,
    includeScreenshots: job.includeScreenshots,
    storeScreenshots: job.storeScreenshots,
    visualEvidenceEnabled: job.storeScreenshots,
    visualEvidenceMaxScreenshots: job.visualEvidenceMaxScreenshots,
    timeoutMs: WORKER_SCAN_TIMEOUT_MS,
  };
}

function isBrowserLaunchFailure(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code === "browser_launch_failed") return true;
  const message = err instanceof Error ? err.message : String(err);
  return /browser launch failed/i.test(message);
}

/**
 * Run a single already-claimed scan job to completion. Persists results and
 * flips the job to completed/failed. Never throws — failures are recorded on
 * the job so the worker loop keeps running.
 */
export async function processScanJob(
  job: ScanJob,
  overrides: Partial<ProcessJobDeps> = {}
): Promise<void> {
  const deps = { ...defaultDeps(), ...overrides };
  const { workspaceId } = job;
  const scanJobId = job.id;
  const workerId = job.claimedBy;
  const log = (level: WorkerLogLevel, event: string, details: Record<string, unknown> = {}) =>
    logScanEvent(level, event, { scanId: scanJobId, workspaceId, ...details });

  if (!workerId) {
    log("warn", "ownership-lost", { reason: "missing_claim_owner" });
    return;
  }

  if (!job.permissionConfirmed) {
    log("warn", "fail", { error: "permission_not_confirmed" });
    await deps.markScanFailed(
      workspaceId,
      scanJobId,
      "permission_not_confirmed",
      workerId
    );
    return;
  }

  const input = scanInputForJob(job);

  if (job.usePageJobs) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const targetsPromise = deps.resolveScanTargets(
        input,
        CRAWL_RESOLUTION_TIMEOUT_MS
      );
      targetsPromise.catch(() => undefined);
      const targets = await Promise.race([
        targetsPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("crawl_deadline_exceeded")),
            CRAWL_RESOLUTION_TIMEOUT_MS
          );
        }),
      ]);
      if (targets.length === 0) throw new Error("no_scan_targets_resolved");
      const pagesTotal = await deps.createPageJobs(workspaceId, scanJobId, targets);
      log("info", "page-jobs-created", { pagesTotal });
    } catch (err) {
      const msg = (err as Error).message || "crawl_resolution_failed";
      log("error", "fail", { error: msg });
      await deps.markScanFailed(workspaceId, scanJobId, msg, workerId);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return;
  }

  let lastPagesScanned = 0;
  let browserStartSeen = false;
  let firstPageSeen = false;
  let lastStartedUrl: string | undefined;
  const onProgress = async (update: ProgressUpdate) => {
    const now = new Date();
    const timings: ScanTimings = { lastProgressAt: now };
    if (update.step === "starting_browser" && !browserStartSeen) {
      browserStartSeen = true;
      timings.browserStartedAt = now;
      log("info", "browser-start");
    }
    if (update.step === "scanning") {
      if (!firstPageSeen) {
        firstPageSeen = true;
        timings.firstPageStartedAt = now;
      }
      // Page-boundary updates carry no currentState; per-viewport pings do.
      // Log page-end/page-start only on a genuine new page, not sub-page pings.
      if (!update.currentState) {
        if (update.pagesScanned > lastPagesScanned) {
          log("info", "page-end", {
            pagesScanned: update.pagesScanned,
            pagesDiscovered: update.pagesDiscovered,
          });
        }
        lastPagesScanned = update.pagesScanned;
        if (update.currentUrl && update.currentUrl !== lastStartedUrl) {
          lastStartedUrl = update.currentUrl;
          log("info", "page-start", {
            url: update.currentUrl,
            pagesScanned: update.pagesScanned,
            pagesDiscovered: update.pagesDiscovered,
          });
        }
      }
    }
    // Realtime progress: plain merge write (no transaction needed). pagesTotal
    // tracks the live discovered count, capped, falling back to the page cap.
    const pagesTotal =
      Math.max(update.pagesScanned, update.pagesDiscovered) || input.maxPages;
    await deps.updateScanJob(workspaceId, scanJobId, {
      progressStep: update.step,
      pagesScanned: update.pagesScanned,
      pagesDiscovered: update.pagesDiscovered,
      pagesDone: update.pagesScanned,
      pagesTotal,
      currentUrl: update.currentUrl ?? null,
      currentStep: update.step,
      currentState: update.currentState ?? null,
      lastProgressAt: now,
      processorHeartbeatAt: now,
      timings,
    });
  };

  try {
    let outcome: ScanOutcome;
    let fallbackReason: ReturnType<typeof staticFallbackReason> = null;
    try {
      outcome = await withHardScanDeadline(
        deps.runScanJob(input, onProgress),
        WORKER_SCAN_HARD_TIMEOUT_MS
      );
      fallbackReason = staticFallbackReasonFromOutcome(outcome);
    } catch (err) {
      fallbackReason = staticFallbackReason(err);
      if (!fallbackReason) throw err;
      outcome = { pages: [], pagesDiscovered: 0, pagesScanned: 0, durationMs: 0 };
    }
    if (fallbackReason) {
      log("warn", "static-fallback", {
        errorCode: fallbackReason.code,
        error: fallbackReason.message,
      });
      await deps.updateScanJob(workspaceId, scanJobId, {
        progressStep: "static_fallback",
        processorError: fallbackReason.code,
        errorMessage:
          `Browser accessibility analysis could not complete (${fallbackReason.code}). ` +
          "Completed a limited static HTML scan instead.",
      });
      const fallbackInput: ScanInput = {
        ...input,
        includeScreenshots: false,
        storeScreenshots: false,
        visualEvidenceEnabled: false,
        visualEvidenceMaxScreenshots: 0,
        timeoutMs: Math.min(input.timeoutMs, STATIC_FALLBACK_TIMEOUT_MS),
      };
      const fallback = await withHardScanDeadline(
        deps.runStaticScanJob(fallbackInput, onProgress),
        STATIC_FALLBACK_TIMEOUT_MS + 5_000
      );
      outcome = annotateStaticFallbackOutcome(fallback, fallbackReason);
    }

    if (outcome.pagesScanned > lastPagesScanned) {
      log("info", "page-end", {
        pagesScanned: outcome.pagesScanned,
        pagesDiscovered: outcome.pagesDiscovered,
      });
    }
    log("info", "save", {
      pagesScanned: outcome.pagesScanned,
      pagesDiscovered: outcome.pagesDiscovered,
    });
    const savingAt = new Date();
    await deps.updateScanJob(workspaceId, scanJobId, {
      progressStep: "saving",
      currentStep: "saving",
      currentUrl: null,
      currentState: null,
      pagesDone: outcome.pagesScanned,
      pagesTotal: Math.max(outcome.pagesScanned, outcome.pagesDiscovered) || input.maxPages,
      lastProgressAt: savingAt,
      processorHeartbeatAt: savingAt,
      timings: { lastProgressAt: savingAt },
    });
    const persisted = await deps.persistScanOutcome(scanJobId, outcome.pages, {
      workspaceId,
      workerId,
      storeScreenshots: job.storeScreenshots,
    });
    if (!persisted) {
      log("warn", "ownership-lost", { stage: "persist-results" });
      return;
    }
    const completed = await deps.completeScanJob(scanJobId, outcome, {
      userId: job.requestedBy,
      workspaceId,
      workerId,
    });
    if (!completed) {
      log("warn", "ownership-lost", { stage: "complete" });
      return;
    }
    if (
      outcome.pages.length === 0 ||
      outcome.pages.every((page) => page.scanFailed)
    ) {
      log("error", "fail", {
        error: "all_pages_failed",
        pagesFailed: Math.max(outcome.pages.length, outcome.pagesDiscovered),
      });
      return;
    }
    log("info", "complete", {
      pagesScanned: outcome.pagesScanned,
      pagesDiscovered: outcome.pagesDiscovered,
      durationMs: outcome.durationMs,
    });
  } catch (err) {
    const msg = (err as Error).message || "worker_scan_failed";
    log("error", "fail", { error: msg });
    if (msg !== "scan_timeout" && !msg.startsWith("URL validation failed")) {
      void captureException(err, {
        scope: "worker-scan",
        scanId: scanJobId,
        scanJobId,
        workspaceId,
      });
    }
    const failed = await deps.markScanFailed(
      workspaceId,
      scanJobId,
      msg,
      workerId
    );
    if (!failed) log("warn", "ownership-lost", { stage: "fail" });
  }
}
