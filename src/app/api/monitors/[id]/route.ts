import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { monitorCapsForPlan, normalizePlan } from "@/lib/entitlements";
import { computeNextRunAt } from "@/lib/monitors/schedule";
import {
  audit,
  deleteMonitor,
  getMonitor,
  getWorkspace,
  updateMonitor,
} from "@/lib/data/firestore";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "paused"]).optional(),
  frequency: z.enum(["daily", "every_3_days", "weekly"]).optional(),
  scanConfig: z
    .object({
      scanType: z.enum(["single", "multi", "sitemap", "manual"]),
      maxPages: z.number().int().min(1).max(1000),
      includeScreenshots: z.boolean(),
    })
    .optional(),
  alertChannels: z
    .object({
      email: z.array(z.string().email()).max(20),
      slackWebhookUrl: z.string().url().nullable().optional(),
    })
    .optional(),
  alertThreshold: z
    .object({
      onNewCritical: z.boolean(),
      onScoreDropBy: z.number().int().min(0).max(100),
    })
    .optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("view_scans");
    const { id } = await params;
    const monitor = await getMonitor(ctx.workspaceId, id);
    if (!monitor) throw new ApiError(404, "not_found");
    return Response.json({ monitor });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("create_scans");
    const { id } = await params;
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    const existing = await getMonitor(ctx.workspaceId, id);
    if (!existing) throw new ApiError(404, "not_found");

    // Changing the cadence must respect the plan and re-base the next run so a
    // shorter interval takes effect immediately rather than after the old slot.
    let nextRunAt: Date | undefined;
    if (parsed.data.frequency && parsed.data.frequency !== existing.frequency) {
      const workspace = await getWorkspace(ctx.workspaceId);
      const caps = monitorCapsForPlan(normalizePlan(workspace?.plan));
      if (!caps.allowedFrequencies.includes(parsed.data.frequency)) {
        throw new ApiError(403, "frequency_not_allowed", "That monitoring frequency is not available on your plan.");
      }
      nextRunAt = computeNextRunAt(parsed.data.frequency);
    }

    const monitor = await updateMonitor(ctx.workspaceId, id, {
      ...parsed.data,
      ...(nextRunAt ? { nextRunAt } : {}),
    });
    if (!monitor) throw new ApiError(404, "not_found");

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "monitor.updated",
      resourceType: "monitor",
      resourceId: id,
      metadata: parsed.data,
    });
    return Response.json({ monitor });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("create_scans");
    const { id } = await params;
    const ok = await deleteMonitor(ctx.workspaceId, id);
    if (!ok) throw new ApiError(404, "not_found");
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "monitor.deleted",
      resourceType: "monitor",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
