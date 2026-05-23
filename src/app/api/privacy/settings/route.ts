/**
 * GET   /api/privacy/settings — read privacy_settings for the workspace
 * PATCH /api/privacy/settings — update toggles
 *
 * Only owners and admins can change privacy settings. Every change is
 * audit-logged so the Compliance Center activity feed reflects it.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { privacySettings } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

const Patch = z.object({
  aiProcessingEnabled: z.boolean().optional(),
  screenshotStorageEnabled: z.boolean().optional(),
  scanDataRetentionDays: z.number().int().min(7).max(3650).optional(),
  regionPreference: z.enum(["eu", "us", "uk", "ca", "other"]).optional(),
});

export async function GET() {
  try {
    const ctx = await requireSession();
    const [row] = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.workspaceId, ctx.workspaceId))
      .limit(1);
    return Response.json({ settings: row ?? null });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }
    const body = await req.json().catch(() => ({}));
    const parsed = Patch.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    await db
      .update(privacySettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(privacySettings.workspaceId, ctx.workspaceId));

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "privacy.updated",
      resourceType: "privacy_settings",
      metadata: parsed.data,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
