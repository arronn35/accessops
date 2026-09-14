"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { audit, updateWorkspace } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";
import { sanitizeCallback } from "@/lib/auth/callback-url";
import { personaById } from "@/lib/onboarding/personas";

const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(200).optional(),
  region: z.string().optional(),
  framework: z.string().optional(),
  targetStandard: z.string().optional(),
  persona: z.string().optional(),
});

export async function updateWorkspaceAction(formData: FormData) {
  const ctx = await getCurrentWorkspaceOrRedirect();
  // Server Actions are network-reachable endpoints: enforce the same role
  // policy as PATCH /api/workspace. Only owners/admins hold manage_privacy.
  if (!roleHasPermission(ctx.member.role, "manage_privacy")) {
    throw new Error("forbidden");
  }
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  await updateWorkspace(ctx.workspace.id, {
    name: parsed.data.name,
    companyName: parsed.data.companyName || null,
    region: parsed.data.region || "eu",
    framework: parsed.data.framework || null,
    targetStandard: parsed.data.targetStandard || "wcag22aa",
    // Only a persona we define is stored; anything else is discarded.
    persona: personaById(parsed.data.persona)?.id ?? null,
  });
  await audit({ userId: ctx.userId, workspaceId: ctx.workspace.id, action: "workspace.updated", resourceType: "workspace", resourceId: ctx.workspace.id });
  // sanitizeCallback rejects the backslash and control-character variants the
  // old prefix check let through; "/app" is its fallback for a bad value.
  const redirectTo = sanitizeCallback(String(formData.get("redirectTo") || ""));
  redirect(redirectTo === "/app" ? "/app/settings" : redirectTo);
}
