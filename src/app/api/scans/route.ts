/**
 * POST /api/scans     — create + enqueue a scan job
 * GET  /api/scans     — list scan jobs for the active workspace (paginated)
 *
 * Security:
 *   - requireSession (workspace membership check)
 *   - validateUrl (cheap synchronous SSRF check; worker does the heavy DNS)
 *   - permission_confirmed must be true
 *   - rate limit via @upstash/ratelimit
 *   - free-plan limits: SCAN_MAX_PAGES_FREE pages, 3 scans/day
 *
 * Side effects:
 *   - INSERT scan_jobs
 *   - enqueueScan (BullMQ) — only fires if DB insert succeeded
 *   - INSERT audit_logs("scan.created")
 *   - UPDATE usage_limits (scansUsedToday + 1)
 */
import { NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  scanJobs,
  usageLimits,
  privacySettings,
} from "@/lib/db/schema";
import {
  validateUrl,
  UrlValidationFailed,
} from "@/lib/scanner/url-validation";
import { enqueueScan } from "@/lib/queue";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit } from "@/lib/api/audit";
import { scanCapsForPlan, type PlanTier } from "@/lib/entitlements";
import { inlineScanFallbackEnabled, processScanInline } from "@/lib/scanner/inline-runner";
import {
  visualEvidenceEnabled as visualEvidenceEnvEnabled,
  visualEvidenceStorageEnabled,
} from "@/lib/config";

const ScanCreateSchema = z.object({
  url: z.string().url().max(2048),
  scanType: z.enum(["single", "multi", "sitemap", "manual"]).default("single"),
  urls: z.array(z.string().url().max(2048)).max(1000).optional(),
  sitemapUrl: z.string().url().max(2048).optional(),
  maxPages: z.number().int().min(1).max(1000).default(3),
  includeScreenshots: z.boolean().default(false),
  storeScreenshots: z.boolean().default(false),
  aiExplanationsEnabled: z.boolean().default(false),
  aiRemediationEnabled: z.boolean().default(false),
  permissionConfirmed: z.literal(true), // must be exactly true
  projectId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = ScanCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input", JSON.stringify(parsed.error.issues));
    }
    const input = parsed.data;

    // 1. URL validation (synchronous — DNS happens in worker).
    let baseValidated: Awaited<ReturnType<typeof validateUrl>>;
    try {
      baseValidated = await validateUrl(input.url, { resolveDns: false });
      if (input.scanType === "manual") {
        const manualUrls = input.urls ?? [];
        if (manualUrls.length === 0) {
          throw new ApiError(400, "manual_urls_required", "Manual scans require at least one URL.");
        }
        for (const rawUrl of manualUrls) {
          const v = await validateUrl(rawUrl, { resolveDns: false });
          if (v.origin !== baseValidated.origin) {
            throw new ApiError(400, "manual_url_origin_mismatch", "Manual URLs must stay on the same origin as the website URL.");
          }
        }
      }
      if (input.scanType === "sitemap" && input.sitemapUrl) {
        const sitemap = await validateUrl(input.sitemapUrl, { resolveDns: false });
        if (sitemap.origin !== baseValidated.origin) {
          throw new ApiError(400, "sitemap_origin_mismatch", "Sitemap URL must stay on the same origin as the website URL.");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof UrlValidationFailed) {
        throw new ApiError(400, err.code, err.detail);
      }
      throw err;
    }

    // 2. Rate limit (per-user, anti-abuse).
    const rl = await checkRateLimit("scanCreate", `${ctx.userId}`);
    if (!rl.ok) {
      throw rateLimitError(rl.reset, rl.remaining, "Too many scans created recently.");
    }

    // 3. Plan + usage caps (free tier).
    const [limits] = await db
      .select()
      .from(usageLimits)
      .where(eq(usageLimits.workspaceId, ctx.workspaceId))
      .limit(1);

    if (!limits) {
      throw new ApiError(500, "no_usage_record");
    }

    // Reset daily counter if the day has rolled over.
    const now = new Date();
    if (now > limits.resetDailyAt) {
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0);
      await db
        .update(usageLimits)
        .set({ scansUsedToday: 0, resetDailyAt: nextReset })
        .where(eq(usageLimits.workspaceId, ctx.workspaceId));
      limits.scansUsedToday = 0;
    }

    const scanCaps = scanCapsForPlan(limits.plan as PlanTier);
    if (limits.scansUsedToday >= scanCaps.dailyScanCap) {
      throw new ApiError(
        429,
        "daily_scan_limit",
        `Daily scan limit (${scanCaps.dailyScanCap}) reached.`
      );
    }

    const maxPages = Math.min(input.maxPages, scanCaps.maxPagesCap);

    // 4. Concurrent scans cap.
    const inflight = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scanJobs)
      .where(
        and(
          eq(scanJobs.workspaceId, ctx.workspaceId),
          sql`${scanJobs.status} in ('queued', 'running')`
        )
      );
    const maxConcurrent = Number(
      process.env.MAX_CONCURRENT_SCANS_PER_WORKSPACE ?? 1
    );
    if ((inflight[0]?.count ?? 0) >= maxConcurrent) {
      throw new ApiError(
        429,
        "scan_concurrency_limit",
        `A scan is already running. Wait for it to finish.`
      );
    }

    // 5. Privacy settings: enforce screenshots-off and AI-off when
    // workspace disabled them, regardless of what the client sent.
    const [privacy] = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.workspaceId, ctx.workspaceId))
      .limit(1);

    const visualEvidenceEnabled =
      input.includeScreenshots &&
      input.permissionConfirmed &&
      visualEvidenceEnvEnabled() &&
      (privacy?.visualEvidenceEnabled ?? false);
    const includeScreenshots = visualEvidenceEnabled;
    const storeScreenshots =
      visualEvidenceEnabled &&
      input.storeScreenshots &&
      visualEvidenceStorageEnabled() &&
      (privacy?.screenshotStorageEnabled ?? false);
    const aiExplanationsEnabled =
      input.aiExplanationsEnabled && (privacy?.aiProcessingEnabled ?? false);
    const aiRemediationEnabled =
      input.aiRemediationEnabled && (privacy?.aiProcessingEnabled ?? false);

    // 6. Persist + enqueue.
    const [job] = await db
      .insert(scanJobs)
      .values({
        workspaceId: ctx.workspaceId,
        projectId: input.projectId,
        requestedBy: ctx.userId,
        scanType: input.scanType,
        status: "queued",
        baseUrl: input.url,
        sourceUrlsJson:
          input.scanType === "manual" || input.scanType === "sitemap"
            ? {
                urls: input.scanType === "manual" ? input.urls ?? [] : undefined,
                sitemapUrl: input.scanType === "sitemap" ? input.sitemapUrl ?? null : undefined,
              }
            : undefined,
        maxPages,
        includeScreenshots,
        storeScreenshots,
        visualEvidenceMaxScreenshots: includeScreenshots
          ? Math.max(0, scanCaps.visualEvidenceMaxPerScan)
          : 0,
        aiExplanationsEnabled,
        aiRemediationEnabled,
        permissionConfirmed: input.permissionConfirmed,
        progressStep: "queued",
      })
      .returning({ id: scanJobs.id });

    let executionMode: "queue" | "inline-degraded" = "queue";
    try {
      await enqueueScan({
        scanJobId: job.id,
        workspaceId: ctx.workspaceId,
        requestedBy: ctx.userId,
      });
    } catch (err) {
      if (!inlineScanFallbackEnabled()) {
        // Roll back so we don't leave a permanently-queued job that no
        // worker will ever pick up.
        await db
          .update(scanJobs)
          .set({
            status: "failed",
            progressStep: "failed",
            errorMessage: `enqueue_failed: ${(err as Error).message}`,
          })
          .where(eq(scanJobs.id, job.id));
        throw new ApiError(503, "queue_unavailable", "Could not enqueue scan");
      }

      executionMode = "inline-degraded";
      try {
        await processScanInline(job.id);
      } catch {
        // The inline runner persists the failed status. Return the job id so
        // the progress page can show the actionable scan failure instead of
        // dropping the user back to the form with a generic queue error.
      }
    }

    // 7. Update usage + audit.
    await db
      .update(usageLimits)
      .set({
        scansUsedToday: sql`${usageLimits.scansUsedToday} + 1`,
        scansUsedThisMonth: sql`${usageLimits.scansUsedThisMonth} + 1`,
      })
      .where(eq(usageLimits.workspaceId, ctx.workspaceId));

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "scan.created",
      resourceType: "scan_job",
      resourceId: job.id,
      metadata: { url: input.url, maxPages },
    });

    return Response.json({ scanJobId: job.id, mode: executionMode }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSession();
    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 20));
    const rows = await db
      .select()
      .from(scanJobs)
      .where(eq(scanJobs.workspaceId, ctx.workspaceId))
      .orderBy(desc(scanJobs.createdAt))
      .limit(limit);
    return Response.json({ scans: rows });
  } catch (err) {
    return apiError(err);
  }
}
