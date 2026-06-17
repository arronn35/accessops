import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { validateUrl, UrlValidationFailed } from "@/lib/scanner/url-validation";
import { monitorCapsForPlan, normalizePlan } from "@/lib/entitlements";
import { computeNextRunAt } from "@/lib/monitors/schedule";
import {
  audit,
  countMonitors,
  createMonitor,
  getScanJob,
  getWorkspace,
  listMonitors,
} from "@/lib/data/firestore";

const ScanConfigSchema = z.object({
  scanType: z.enum(["single", "multi", "sitemap", "manual"]).default("single"),
  maxPages: z.number().int().min(1).max(1000).default(1),
  includeScreenshots: z.boolean().default(false),
});

const CreateSchema = z
  .object({
    // Seed from an existing scan, or pass a URL directly. One is required.
    fromScanId: z.string().optional(),
    targetUrl: z.string().url().max(2048).optional(),
    name: z.string().min(1).max(200).optional(),
    frequency: z.enum(["daily", "every_3_days", "weekly"]).optional(),
    scanConfig: ScanConfigSchema.optional(),
    alertChannels: z
      .object({
        email: z.array(z.string().email()).max(20).optional(),
        slackWebhookUrl: z.string().url().nullable().optional(),
      })
      .optional(),
    alertThreshold: z
      .object({
        onNewCritical: z.boolean().optional(),
        onScoreDropBy: z.number().int().min(0).max(100).optional(),
      })
      .optional(),
  })
  .refine((v) => v.fromScanId || v.targetUrl, {
    message: "Provide either fromScanId or targetUrl.",
  });

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export async function GET() {
  try {
    const ctx = await requirePermission("view_scans");
    return Response.json({ monitors: await listMonitors(ctx.workspaceId) });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("create_scans");
    const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const input = parsed.data;

    const workspace = await getWorkspace(ctx.workspaceId);
    if (!workspace) throw new ApiError(404, "workspace_not_found");
    const caps = monitorCapsForPlan(normalizePlan(workspace.plan));

    // Plan gating: monitoring is a paid feature (free = 0 monitors).
    if (caps.maxMonitors <= 0) {
      throw new ApiError(403, "monitoring_not_available", "Continuous monitoring is not available on your plan.");
    }

    // Frequency: default to the slowest (cheapest) cadence the plan allows.
    const frequency =
      input.frequency ?? caps.allowedFrequencies[caps.allowedFrequencies.length - 1];
    if (!frequency || !caps.allowedFrequencies.includes(frequency)) {
      throw new ApiError(403, "frequency_not_allowed", "That monitoring frequency is not available on your plan.");
    }

    // Seed target + scan config from an existing scan when requested.
    let targetUrl = input.targetUrl ?? null;
    let scanConfig = input.scanConfig ?? undefined;
    if (input.fromScanId) {
      const scan = await getScanJob(ctx.workspaceId, input.fromScanId);
      if (!scan) throw new ApiError(404, "scan_not_found");
      targetUrl = targetUrl ?? scan.baseUrl;
      scanConfig = scanConfig ?? {
        scanType: scan.scanType,
        maxPages: scan.maxPages,
        includeScreenshots: scan.includeScreenshots,
      };
    }
    if (!targetUrl) throw new ApiError(400, "target_url_required");

    // SSRF / scheme validation, same guard the scan API uses.
    try {
      await validateUrl(targetUrl, { resolveDns: false });
    } catch (err) {
      if (err instanceof UrlValidationFailed) throw new ApiError(400, err.code, err.detail);
      throw err;
    }

    if ((await countMonitors(ctx.workspaceId)) >= caps.maxMonitors) {
      throw new ApiError(409, "monitor_limit_reached", `Your plan allows up to ${caps.maxMonitors} monitor(s).`);
    }

    const monitor = await createMonitor(ctx.workspaceId, {
      name: input.name ?? hostOf(targetUrl),
      targetUrl,
      frequency,
      scanConfig: scanConfig
        ? {
            scanType: scanConfig.scanType,
            maxPages: scanConfig.maxPages,
            includeScreenshots: scanConfig.includeScreenshots,
          }
        : undefined,
      nextRunAt: computeNextRunAt(frequency),
      alertChannels: input.alertChannels
        ? {
            email: input.alertChannels.email ?? [],
            slackWebhookUrl: input.alertChannels.slackWebhookUrl ?? null,
          }
        : undefined,
      alertThreshold: input.alertThreshold
        ? {
            onNewCritical: input.alertThreshold.onNewCritical ?? true,
            onScoreDropBy: input.alertThreshold.onScoreDropBy ?? 5,
          }
        : undefined,
      createdBy: ctx.userId,
    });

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "monitor.created",
      resourceType: "monitor",
      resourceId: monitor.id,
      metadata: { targetUrl, frequency, fromScanId: input.fromScanId ?? null },
    });

    return Response.json({ monitor }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
