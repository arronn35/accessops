"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { audit, updateWorkspace } from "@/lib/data/firestore";

const Schema = z.object({
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(200).optional(),
  region: z.string().optional(),
  framework: z.string().optional(),
  targetStandard: z.string().optional(),
});

export async function updateWorkspaceAction(formData: FormData) {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  await updateWorkspace(ctx.workspace.id, {
    name: parsed.data.name,
    companyName: parsed.data.companyName || null,
    region: parsed.data.region || "eu",
    framework: parsed.data.framework || null,
    targetStandard: parsed.data.targetStandard || "wcag22aa",
  });
  await audit({ userId: ctx.userId, workspaceId: ctx.workspace.id, action: "workspace.updated", resourceType: "workspace", resourceId: ctx.workspace.id });
  const redirectTo = String(formData.get("redirectTo") || "/app/settings");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/app/settings");
}
