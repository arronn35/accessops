import { NextRequest } from "next/server";
import { z } from "zod";
import { validateUrl, UrlValidationFailed } from "@/lib/scanner/url-validation";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { roleHasPermission } from "@/lib/entitlements";
import {
  audit,
  countInflightScans,
  createScanJob,
  getPrivacySettings,
  getWorkspace,
  listScans,
  reserveScanQuota,
} from "@/lib/data/firestore";
import { scanCapsForPlan, normalizePlan } from "@/lib/entitlements";
import { pageJobsEnabled } from "@/lib/data/page-jobs";
import {
  enqueueScanTask,
  scanDispatchConfiguration,
  scanDispatchMode,
} from "@/lib/scanner/dispatch";
import { captureException } from "@/lib/observability";

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
  permissionConfirmed: z.literal(true),
  projectId: z.string().optional(),
});

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "create_scans")) {
      throw new ApiError(403, "forbidden");
    }
    const body = await req.json().catch(() => ({}));
    const parsed = ScanCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input", JSON.stringify(parsed.error.issues));
    }
    const input = parsed.data;

    let baseValidated: Awaited<ReturnType<typeof validateUrl>>;
    try {
      baseValidated = await validateUrl(input.url, { resolveDns: false });
      if (input.scanType === "manual") {
        const manualUrls = input.urls ?? [];
        if (!manualUrls.length) {
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
      if (err instanceof UrlValidationFailed) throw new ApiError(400, err.code, err.detail);
      throw err;
    }

    const rl = await checkRateLimit("scanCreate", ctx.userId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining, "Too many scans created recently.");

    const dispatch = scanDispatchConfiguration();
    if (!dispatch.configured) {
      throw new ApiError(
        503,
        "scan_dispatch_not_configured",
        `Scan processing is temporarily unavailable (${dispatch.missing.join(", ")}).`
      );
    }

    const workspace = await getWorkspace(ctx.workspaceId);
    if (!workspace) throw new ApiError(404, "workspace_not_found");
    const plan = normalizePlan(workspace.plan);
    const caps = scanCapsForPlan(plan);
    const maxPages = Math.min(input.maxPages, caps.maxPagesCap);
    const privacy = await getPrivacySettings(ctx.workspaceId);
    const screenshotsRequested = input.includeScreenshots || input.storeScreenshots;
    const screenshotsAllowed =
      screenshotsRequested &&
      privacy.visualEvidenceEnabled &&
      privacy.screenshotStorageEnabled;
    const aiRequested = input.aiExplanationsEnabled || input.aiRemediationEnabled;
    const aiAllowed = aiRequested && privacy.aiProcessingEnabled;
    const warnings: string[] = [];
    if (aiRequested && !aiAllowed) {
      warnings.push("AI analysis was requested, but workspace AI processing consent is disabled.");
    }
    if (screenshotsRequested && !screenshotsAllowed) {
      warnings.push("Visual evidence was requested, but workspace visual evidence and screenshot storage consent are both required.");
    }
    const maxConcurrent = Number(process.env.MAX_CONCURRENT_SCANS_PER_WORKSPACE ?? 1);
    if ((await countInflightScans(ctx.workspaceId)) >= maxConcurrent) {
      throw new ApiError(429, "scan_concurrency_limit", "A scan is already running. Wait for it to finish.");
    }

    let reserved: Awaited<ReturnType<typeof reserveScanQuota>>;
    try {
      reserved = await reserveScanQuota({
        workspaceId: ctx.workspaceId,
        plan,
        maxPages,
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith("daily_workspace_capacity_reached")) {
        throw new ApiError(429, "daily_scan_limit", "Daily free workspace capacity reached.");
      }
      if (msg.startsWith("daily_free_capacity_reached")) {
        throw new ApiError(429, "daily_free_capacity_reached", "Daily free capacity reached. Please try again tomorrow.");
      }
      throw err;
    }

    const job = await createScanJob({
      workspaceId: ctx.workspaceId,
      projectId: input.projectId ?? null,
      requestedBy: ctx.userId,
      scanType: input.scanType,
      status: "queued",
      baseUrl: input.url,
      // Build only the keys that apply — never write `undefined` values, which
      // Firestore rejects (`Cannot use 'undefined' as a Firestore value`).
      sourceUrlsJson:
        input.scanType === "manual"
          ? { urls: input.urls ?? [] }
          : input.scanType === "sitemap"
            ? { sitemapUrl: input.sitemapUrl ?? null }
            : null,
      maxPages: reserved.maxPages,
      includeScreenshots: screenshotsRequested,
      storeScreenshots: screenshotsAllowed,
      visualEvidenceMaxScreenshots: screenshotsAllowed ? caps.visualEvidenceMaxPerScan : 0,
      aiExplanationsEnabled: input.aiExplanationsEnabled && aiAllowed,
      aiRemediationEnabled: input.aiRemediationEnabled && aiAllowed,
      permissionConfirmed: input.permissionConfirmed,
      progressStep: screenshotsRequested && !screenshotsAllowed ? "screenshot_consent_required" : "queued",
      errorMessage: warnings.length > 0 ? warnings.join(" ") : null,
      queueAttempts: 0,
      lastQueuePublishedAt: null,
      processorStartedAt: null,
      processorHeartbeatAt: null,
      processorError: null,
      usePageJobs: pageJobsEnabled(),
    });

    // Dispatch: the job is always created with status "queued". In poll mode a
    // long-running worker claims it (see worker/index.ts). In cloud-tasks mode
    // we also wake the scale-to-zero Cloud Run worker via Cloud Tasks. The
    // enqueue is best-effort: if it fails the job stays "queued" and the
    // sweeper (Cloud Scheduler → /api/internal/scans/sweep) re-enqueues it, so
    // a scan is never silently stranded.
    const mode = "queued" as const;
    if (scanDispatchMode() === "cloud-tasks") {
      try {
        await enqueueScanTask({ scanJobId: job.id, reason: "scan_created" });
      } catch (err) {
        void captureException(err, {
          scope: "scan.dispatch",
          scanJobId: job.id,
          workspaceId: ctx.workspaceId,
        });
      }
    }

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "scan.created",
      resourceType: "scan_job",
      resourceId: job.id,
      metadata: { url: input.url, maxPages: reserved.maxPages, mode, engine: "playwright-axe" },
    });

    return Response.json(
      {
        scanJobId: job.id,
        mode,
        warnings,
        appliedOptions: {
          aiExplanationsEnabled: input.aiExplanationsEnabled && aiAllowed,
          aiRemediationEnabled: input.aiRemediationEnabled && aiAllowed,
          includeScreenshots: screenshotsRequested,
          storeScreenshots: screenshotsAllowed,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_scans")) {
      throw new ApiError(403, "forbidden");
    }
    const limit = Math.min(50, Number(req.nextUrl.searchParams.get("limit") ?? 20));
    const scans = await listScans(ctx.workspaceId, limit);
    return Response.json({ scans });
  } catch (err) {
    return apiError(err);
  }
}
