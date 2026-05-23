/**
 * maitrico AccessOps AI — scan worker.
 *
 * Runs on Railway (or any Docker host). Connects to:
 *   - Redis (BullMQ queue) via REDIS_URL
 *   - Postgres via DATABASE_URL
 *
 * Lifecycle:
 *   1. Long-poll the BullMQ queue.
 *   2. For each job: load scan_jobs row, run scanner, persist
 *      scan_pages + accessibility_issues, update progress, mark
 *      completed/failed.
 *   3. SIGTERM → drain in-flight job, close browser, close Redis,
 *      close Postgres pool, exit.
 *
 * Health: exposes a tiny HTTP server on WORKER_HEALTH_PORT (default 8080)
 * with GET /healthz returning { ok: true }. Railway and uptime monitors
 * can hit this.
 *
 * Concurrency: WORKER_CONCURRENCY (default 1). Cost guard for free-tier
 * Railway. Scale by adding more worker instances, not by raising
 * concurrency past ~2 per CPU.
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { createServer } from "node:http";
import { eq, sql } from "drizzle-orm";
import {
  db,
  scanJobs,
  scanPages,
  accessibilityIssues,
  auditLogs,
  usageLimits,
} from "../src/lib/db";
import { runScanJob } from "../src/lib/scanner";
import {
  scanQueueName,
  reportPdfQueueName,
  getRedisConnectionOptions,
  type ScanJobPayload,
  type ReportPdfJobPayload,
} from "../src/lib/queue";
import IORedis from "ioredis";
import type { NormalizedIssue, NormalizedPage } from "../src/lib/scanner/types";
import { captureException } from "../src/lib/observability";
import { reportPdfHandler } from "./report-pdf";
import { storageConfigured } from "../src/lib/storage/r2";

// ============================================================
// Config
// ============================================================
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 1));
const SCAN_TIMEOUT_MS = Math.max(15_000, Number(process.env.SCAN_TIMEOUT_MS ?? 60_000));
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 8080);

console.log("[worker] starting", {
  concurrency: CONCURRENCY,
  timeoutMs: SCAN_TIMEOUT_MS,
  redisUrl: redact(process.env.REDIS_URL),
  databaseUrl: redact(process.env.DATABASE_URL),
});

function redact(s?: string): string {
  if (!s) return "(unset)";
  return s.replace(/(\/\/)([^@]+)@/, "$1***@").slice(0, 80);
}

// ============================================================
// Health endpoint
// ============================================================
let healthy = true;
const healthServer = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(healthy ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: healthy, ts: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end();
});
healthServer.listen(HEALTH_PORT, () =>
  console.log(`[worker] health on :${HEALTH_PORT}/healthz`)
);

// ============================================================
// Worker
// ============================================================
const connection = new IORedis(process.env.REDIS_URL!, getRedisConnectionOptions());

const worker = new Worker<ScanJobPayload>(
  scanQueueName,
  async (job: Job<ScanJobPayload>) => processScanJob(job),
  {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: SCAN_TIMEOUT_MS + 30_000,
  }
);

worker.on("active", (job) => console.log("[worker] active", job.id));
worker.on("completed", (job) => console.log("[worker] completed", job.id));
worker.on("failed", (job, err) =>
  console.error("[worker] failed", job?.id, err?.message)
);
worker.on("error", (err) => console.error("[worker] error", err));

// ============================================================
// Report PDF worker (optional, only when R2 / S3 is configured)
// ============================================================
let reportPdfWorker: Worker<ReportPdfJobPayload> | null = null;
if (storageConfigured()) {
  reportPdfWorker = new Worker<ReportPdfJobPayload>(
    reportPdfQueueName,
    async (job: Job<ReportPdfJobPayload>) => reportPdfHandler(job.data),
    {
      connection,
      // PDFs are CPU-light vs. scans; safe to run more at once if a
      // scan is in flight on the same instance.
      concurrency: Math.max(1, CONCURRENCY * 2),
      lockDuration: 90_000,
    }
  );
  reportPdfWorker.on("completed", (job) =>
    console.log("[worker.pdf] completed", job.id)
  );
  reportPdfWorker.on("failed", (job, err) =>
    console.error("[worker.pdf] failed", job?.id, err?.message)
  );
  console.log("[worker] report-pdf queue active");
} else {
  console.log("[worker] storage not configured; report-pdf queue is paused");
}

// ============================================================
// Job handler
// ============================================================
async function processScanJob(job: Job<ScanJobPayload>) {
  const { scanJobId } = job.data;
  const startedAt = new Date();

  // 1. Load the persisted scan_jobs row (source of truth for params).
  const [row] = await db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.id, scanJobId))
    .limit(1);

  if (!row) {
    throw new Error(`scan_job ${scanJobId} not found`);
  }

  if (!row.permissionConfirmed) {
    // Safety net: API should have already enforced this.
    await markFailed(scanJobId, "permission_not_confirmed");
    return;
  }

  // 2. Mark running.
  await db
    .update(scanJobs)
    .set({
      status: "running",
      progressStep: "starting_browser",
      startedAt,
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, scanJobId));

  // 3. Race the scan against the overall job timeout.
  const scanPromise = runScanJob(
    {
      jobId: scanJobId,
      url: row.baseUrl,
      sourceUrls: row.sourceUrlsJson?.urls,
      sitemapUrl: row.sourceUrlsJson?.sitemapUrl,
      maxPages: row.maxPages,
      scanType: row.scanType,
      includeScreenshots: row.includeScreenshots,
      storeScreenshots: row.storeScreenshots,
      timeoutMs: SCAN_TIMEOUT_MS,
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

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("scan_timeout")), SCAN_TIMEOUT_MS)
  );

  let outcome;
  try {
    outcome = await Promise.race([scanPromise, timeoutPromise]);
  } catch (err) {
    const msg = (err as Error).message || "scan_failed";
    console.error("[worker] scan error", scanJobId, msg);
    // Timeouts and SSRF rejections are expected outcomes — only ship
    // genuinely unexpected failures to Sentry.
    if (msg !== "scan_timeout" && !msg.startsWith("Redirect rejected")) {
      void captureException(err, {
        scope: "worker",
        scanJobId,
        workspaceId: row.workspaceId,
      });
    }
    await markFailed(scanJobId, msg);
    return;
  }

  // 4. Persist results.
  await db
    .update(scanJobs)
    .set({ progressStep: "saving", updatedAt: new Date() })
    .where(eq(scanJobs.id, scanJobId));

  await persistOutcome(scanJobId, outcome.pages);

  // 5. Mark complete + bump usage.
  await db
    .update(scanJobs)
    .set({
      status: "completed",
      progressStep: "completed",
      pagesScanned: outcome.pagesScanned,
      pagesDiscovered: outcome.pagesDiscovered,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, scanJobId));

  await db
    .update(usageLimits)
    .set({
      pagesScannedThisMonth: sql`${usageLimits.pagesScannedThisMonth} + ${outcome.pagesScanned}`,
    })
    .where(eq(usageLimits.workspaceId, row.workspaceId));

  await db.insert(auditLogs).values({
    userId: row.requestedBy,
    workspaceId: row.workspaceId,
    action: "scan.completed",
    resourceType: "scan_job",
    resourceId: scanJobId,
    metadataJson: {
      pagesScanned: outcome.pagesScanned,
      durationMs: outcome.durationMs,
    },
  });
}

async function persistOutcome(
  scanJobId: string,
  pages: NormalizedPage[]
): Promise<void> {
  // Postgres batching: one insert per page (we need its UUID for issue FKs).
  for (const p of pages) {
    const [pageRow] = await db
      .insert(scanPages)
      .values({
        scanJobId,
        url: p.url,
        title: p.title,
        statusCode: p.statusCode,
        scannedAt: p.scannedAt,
        screenshotPath: p.screenshotPath,
        rawMetadataJson: p.rawMetadata,
      })
      .returning({ id: scanPages.id });

    if (!p.issues.length) continue;

    await db.insert(accessibilityIssues).values(
      p.issues.map((i: NormalizedIssue) => ({
        scanJobId,
        scanPageId: pageRow.id,
        ruleId: i.ruleId,
        impact: i.impact,
        severity: i.severity,
        wcagTagsJson: i.wcagTags,
        description: i.description,
        help: i.help,
        helpUrl: i.helpUrl,
        targetJson: i.target,
        htmlSnippet: i.htmlSnippet,
        failureSummary: i.failureSummary,
        humanReviewRequired: i.humanReviewRequired,
      }))
    );
  }
}

async function markFailed(scanJobId: string, errorMessage: string) {
  await db
    .update(scanJobs)
    .set({
      status: "failed",
      progressStep: "failed",
      errorMessage,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, scanJobId));
}

// ============================================================
// Graceful shutdown
// ============================================================
async function shutdown(signal: NodeJS.Signals) {
  console.log("[worker] shutdown signal", signal);
  healthy = false;
  try {
    await worker.close();
    if (reportPdfWorker) await reportPdfWorker.close();
    await connection.quit();
    healthServer.close();
  } catch (err) {
    console.error("[worker] shutdown error", err);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => {
  console.error("[worker] uncaughtException", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[worker] unhandledRejection", err);
});
