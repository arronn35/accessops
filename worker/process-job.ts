/**
 * Worker job processing — the bridge between a claimed ScanJob row and the
 * real Playwright + axe-core engine.
 *
 * This is deliberately dependency-injectable so the lifecycle (success,
 * browser-launch fallback, failure) can be unit-tested without Firebase or a
 * real browser. The runtime loop in `index.ts` calls it with the real deps.
 */
import { runScanJob } from "@/lib/scanner";
import { runStaticScanJob } from "@/lib/scanner/static-runner";
import {
  completeScanJob,
  markScanFailed,
  persistScanOutcome,
} from "@/lib/scanner/persistence";
import { updateScanJob } from "@/lib/data/firestore";
import { captureException } from "@/lib/observability";
import type { ProgressUpdate, ScanInput, ScanOutcome } from "@/lib/scanner/types";
import type { ScanJob } from "@/lib/data/types";

export interface ProcessJobDeps {
  runScanJob: typeof runScanJob;
  runStaticScanJob: typeof runStaticScanJob;
  persistScanOutcome: typeof persistScanOutcome;
  completeScanJob: typeof completeScanJob;
  markScanFailed: typeof markScanFailed;
  updateScanJob: typeof updateScanJob;
}

function defaultDeps(): ProcessJobDeps {
  return {
    runScanJob,
    runStaticScanJob,
    persistScanOutcome,
    completeScanJob,
    markScanFailed,
    updateScanJob,
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

  if (!job.permissionConfirmed) {
    await deps.markScanFailed(workspaceId, scanJobId, "permission_not_confirmed");
    return;
  }

  const input = scanInputForJob(job);
  const onProgress = async (update: ProgressUpdate) => {
    await deps.updateScanJob(workspaceId, scanJobId, {
      progressStep: update.step,
      pagesScanned: update.pagesScanned,
      pagesDiscovered: update.pagesDiscovered,
      processorHeartbeatAt: new Date(),
    });
  };

  try {
    let outcome: ScanOutcome;
    try {
      outcome = await deps.runScanJob(input, onProgress);
    } catch (err) {
      if (!isBrowserLaunchFailure(err)) throw err;
      // Chromium could not start in this environment. Degrade to the static
      // HTML scan rather than failing the job outright.
      await deps.updateScanJob(workspaceId, scanJobId, {
        progressStep: "static_fallback",
        processorError: "browser_launch_failed",
        errorMessage:
          "Browser worker could not launch Chromium. Completed a static HTML scan instead.",
      });
      outcome = await deps.runStaticScanJob(
        {
          ...input,
          includeScreenshots: false,
          storeScreenshots: false,
          visualEvidenceEnabled: false,
          visualEvidenceMaxScreenshots: 0,
        },
        onProgress
      );
    }

    await deps.updateScanJob(workspaceId, scanJobId, {
      progressStep: "saving",
      processorHeartbeatAt: new Date(),
    });
    await deps.persistScanOutcome(scanJobId, outcome.pages, {
      workspaceId,
      storeScreenshots: job.storeScreenshots,
    });
    await deps.completeScanJob(scanJobId, outcome, {
      userId: job.requestedBy,
      workspaceId,
    });
  } catch (err) {
    const msg = (err as Error).message || "worker_scan_failed";
    if (msg !== "scan_timeout" && !msg.startsWith("URL validation failed")) {
      void captureException(err, { scope: "worker-scan", scanJobId, workspaceId });
    }
    await deps.markScanFailed(workspaceId, scanJobId, msg);
    await deps.updateScanJob(workspaceId, scanJobId, {
      processorHeartbeatAt: new Date(),
      processorError: msg,
    });
  }
}
