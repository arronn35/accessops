import { randomUUID } from "node:crypto";
import { captureException } from "@/lib/observability";
import { completeScanJob, markScanFailed, persistScanOutcome } from "./persistence";
import { runStaticScanJob } from "./static-runner";
import {
  claimScanJob,
  findScanJob,
  updateScanJob,
} from "@/lib/data/firestore";
import type { ProgressUpdate, ScanInput, ScanOutcome } from "./types";

const INLINE_SCAN_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.INLINE_SCAN_TIMEOUT_MS ?? 25_000)
);

/**
 * Static HTML scan processor: fetch-only, no browser, no screenshots. Queue
 * consumers call this path through the internal Vercel endpoint.
 */
export function inlineScanFallbackEnabled(): boolean {
  return true;
}

/**
 * Some queue failures mean the scanner engine itself is unavailable rather
 * than the scan request being invalid. Keep a small retry-friendly fallback
 * classification for older queued jobs and transient transport errors.
 */
export function inlineScanFallbackAllowedForQueueError(err: unknown): boolean {
  if (inlineScanFallbackEnabled()) return true;
  const message = err instanceof Error ? err.message : String(err);
  return [
    "max requests limit exceeded",
    "queue configuration is required",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "Connection is closed",
    "Connection is closed.",
    "Reached the max retries per request limit",
  ].some((needle) => message.includes(needle));
}

export async function processScanInline(
  scanJobId: string,
  options: { allowQueueFailureFallback?: boolean } = {}
): Promise<void> {
  if (!options.allowQueueFailureFallback && !inlineScanFallbackEnabled()) {
    throw new Error("inline_scan_fallback_disabled");
  }

  const row = await findScanJob(scanJobId);

  if (!row) throw new Error(`scan_job ${scanJobId} not found`);
  if (row.status === "completed" || row.status === "failed" || row.status === "cancelled") {
    return;
  }
  if (
    row.status === "running" &&
    row.startedAt &&
    Date.now() - row.startedAt.getTime() < INLINE_SCAN_TIMEOUT_MS + 30_000
  ) {
    return;
  }
  const workerId = `inline-${randomUUID().slice(0, 8)}`;
  const claimed = await claimScanJob(row.workspaceId, scanJobId, workerId);
  if (!claimed) return;

  if (!row.permissionConfirmed) {
    await markScanFailed(
      row.workspaceId,
      scanJobId,
      "permission_not_confirmed",
      workerId
    );
    return;
  }

  await updateScanJob(row.workspaceId, scanJobId, {
    errorMessage:
      row.includeScreenshots && !row.storeScreenshots
        ? "Screenshot capture was requested, but workspace screenshot storage consent is disabled."
        : row.errorMessage ?? null,
  });

  try {
    const scanInput: ScanInput = {
      jobId: scanJobId,
      url: row.baseUrl,
      sourceUrls: row.sourceUrlsJson?.urls,
      sitemapUrl: row.sourceUrlsJson?.sitemapUrl,
      maxPages: row.maxPages,
      scanType: row.scanType,
      includeScreenshots: row.includeScreenshots,
      storeScreenshots: row.storeScreenshots,
      visualEvidenceEnabled: row.storeScreenshots,
      visualEvidenceMaxScreenshots: row.visualEvidenceMaxScreenshots,
      timeoutMs: INLINE_SCAN_TIMEOUT_MS,
    };
    const onProgress = async (update: ProgressUpdate) => {
      await updateScanJob(row.workspaceId, scanJobId, {
        progressStep: update.step,
        pagesScanned: update.pagesScanned,
        pagesDiscovered: update.pagesDiscovered,
        processorHeartbeatAt: new Date(),
      });
    };

    const staticInput: ScanInput = {
      ...scanInput,
      includeScreenshots: false,
      storeScreenshots: false,
      visualEvidenceEnabled: false,
      visualEvidenceMaxScreenshots: 0,
    };
    let outcome: ScanOutcome = await runStaticScanJob(staticInput, onProgress);
    if (row.storeScreenshots) {
      await updateScanJob(row.workspaceId, scanJobId, {
        progressStep: "browser_fallback",
        processorError: "serverless_static_only",
        errorMessage:
          "Screenshot capture requires a dedicated browser worker. Completed a static accessibility scan instead.",
      });
      outcome = {
        ...outcome,
        pages: outcome.pages.map((page) => ({
          ...page,
          rawMetadata: {
            ...(page.rawMetadata ?? {}),
            browserScanSkipped: true,
            browserSkipReason: "serverless_static_only",
            screenshotCaptureStatus: "serverless_static_fallback",
          },
        })),
      };
    }

    await updateScanJob(row.workspaceId, scanJobId, { progressStep: "saving" });

    const persisted = await persistScanOutcome(scanJobId, outcome.pages, {
      workspaceId: row.workspaceId,
      workerId,
      storeScreenshots: false,
    });
    if (!persisted) return;
    await updateScanJob(row.workspaceId, scanJobId, {
      processorHeartbeatAt: new Date(),
      processorError: null,
    });
    await completeScanJob(scanJobId, outcome, {
      userId: row.requestedBy,
      workspaceId: row.workspaceId,
      workerId,
    });
  } catch (err) {
    const msg = (err as Error).message || "inline_scan_failed";
    if (msg !== "scan_timeout" && !msg.startsWith("URL validation failed")) {
      void captureException(err, {
        scope: "inline-scan",
        scanJobId,
        workspaceId: row.workspaceId,
      });
    }
    await markScanFailed(row.workspaceId, scanJobId, msg, workerId);
    throw err;
  }
}
