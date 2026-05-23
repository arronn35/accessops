import { eq } from "drizzle-orm";
import { db, scanJobs } from "@/lib/db";
import { captureException } from "@/lib/observability";
import { completeScanJob, markScanFailed, persistScanOutcome } from "./persistence";
import { runStaticScanJob } from "./static-runner";

const INLINE_SCAN_TIMEOUT_MS = Math.max(
  10_000,
  Number(process.env.INLINE_SCAN_TIMEOUT_MS ?? 25_000)
);

export function inlineScanFallbackEnabled(): boolean {
  return process.env.INLINE_SCAN_FALLBACK_ENABLED === "true";
}

export async function processScanInline(scanJobId: string): Promise<void> {
  if (!inlineScanFallbackEnabled()) {
    throw new Error("inline_scan_fallback_disabled");
  }

  const [row] = await db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.id, scanJobId))
    .limit(1);

  if (!row) throw new Error(`scan_job ${scanJobId} not found`);
  if (!row.permissionConfirmed) {
    await markScanFailed(scanJobId, "permission_not_confirmed");
    return;
  }

  await db
    .update(scanJobs)
    .set({
      status: "running",
      progressStep: "starting_browser",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, scanJobId));

  try {
    const outcome = await runStaticScanJob(
      {
        jobId: scanJobId,
        url: row.baseUrl,
        sourceUrls: row.sourceUrlsJson?.urls,
        sitemapUrl: row.sourceUrlsJson?.sitemapUrl,
        maxPages: row.maxPages,
        scanType: row.scanType,
        includeScreenshots: row.includeScreenshots,
        storeScreenshots: row.storeScreenshots,
        timeoutMs: INLINE_SCAN_TIMEOUT_MS,
      },
      async (update) => {
        await db
          .update(scanJobs)
          .set({
            progressStep: update.step,
            pagesScanned: update.pagesScanned,
            pagesDiscovered: update.pagesDiscovered,
            updatedAt: new Date(),
          })
          .where(eq(scanJobs.id, scanJobId));
      }
    );

    await db
      .update(scanJobs)
      .set({ progressStep: "saving", updatedAt: new Date() })
      .where(eq(scanJobs.id, scanJobId));

    await persistScanOutcome(scanJobId, outcome.pages);
    await completeScanJob(scanJobId, outcome, {
      userId: row.requestedBy,
      workspaceId: row.workspaceId,
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
    await markScanFailed(scanJobId, msg);
    throw err;
  }
}
