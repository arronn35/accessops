import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getPrivacySettings, updatePrivacySettings } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

const Patch = z.object({
  aiProcessingEnabled: z.boolean().optional(),
  screenshotStorageEnabled: z.boolean().optional(),
  visualEvidenceEnabled: z.boolean().optional(),
  visualEvidenceRetentionDays: z.number().int().min(1).max(365).optional(),
  scanDataRetentionDays: z.number().int().min(7).max(3650).optional(),
  regionPreference: z.enum(["eu", "us", "uk", "ca", "other"]).optional(),
});

export async function GET() {
  try {
    const ctx = await requireSession();
    return Response.json({ settings: await getPrivacySettings(ctx.workspaceId) });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "manage_privacy")) throw new ApiError(403, "forbidden");
    const parsed = Patch.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const patch = { ...parsed.data };
    if (patch.visualEvidenceEnabled === false) {
      patch.screenshotStorageEnabled = false;
    }
    if (patch.screenshotStorageEnabled === true) {
      patch.visualEvidenceEnabled = true;
    }
    await updatePrivacySettings(ctx.workspaceId, patch);
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "privacy.updated",
      resourceType: "privacy_settings",
      metadata: patch,
    });
    return Response.json({ ok: true, settings: await getPrivacySettings(ctx.workspaceId) });
  } catch (err) {
    return apiError(err);
  }
}
