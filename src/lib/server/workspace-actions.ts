"use server";

/**
 * Server Actions for workspace settings.
 *
 * Used by /workspace/setup (first-run) and /app/settings (ongoing).
 * The workspace already exists — it is bootstrapped on first sign-in —
 * so these actions UPDATE it rather than creating one.
 *
 * Only owner/admin members may change workspace settings.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { audit } from "@/lib/api/audit";

const REGIONS = ["eu", "us", "uk", "ca", "other"] as const;
const STANDARDS = [
  "wcag22aa",
  "wcag21aa",
  "ada",
  "eaa",
  "508",
  "en301",
  "unsure",
] as const;

const WorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
  region: z.enum(REGIONS),
  framework: z.string().trim().max(40).optional().or(z.literal("")),
  targetStandard: z.enum(STANDARDS),
});

/**
 * Update the current workspace's settings.
 *
 * Used directly as a `<form action={...}>` handler, so it returns void.
 * Authorization is re-checked here: non-owner/admin submissions are a
 * no-op (the UI also disables the form for those roles).
 */
export async function updateWorkspaceAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentWorkspaceOrRedirect();

  if (ctx.member.role !== "owner" && ctx.member.role !== "admin") {
    return;
  }

  const parsed = WorkspaceSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName") ?? undefined,
    region: formData.get("region"),
    framework: formData.get("framework") ?? undefined,
    targetStandard: formData.get("targetStandard"),
  });

  if (!parsed.success) {
    return;
  }

  await db
    .update(workspaces)
    .set({
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      region: parsed.data.region,
      framework: parsed.data.framework || null,
      targetStandard: parsed.data.targetStandard,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, ctx.workspace.id));

  await audit({
    userId: ctx.userId,
    workspaceId: ctx.workspace.id,
    action: "workspace.updated",
    resourceType: "workspace",
    resourceId: ctx.workspace.id,
  });

  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }

  revalidatePath("/app/settings");
}
