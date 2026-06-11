import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getWorkspace, updateWorkspace } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

const PatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  companyName: z.string().trim().max(200).optional().nullable(),
  region: z.enum(["eu", "us", "uk", "ca", "other"]).optional(),
  framework: z.string().trim().max(40).optional().nullable(),
  targetStandard: z.enum(["wcag22aa", "wcag21aa", "ada", "eaa", "508", "en301", "unsure"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "manage_privacy")) {
      throw new ApiError(403, "forbidden", "Only owners or admins can change workspace settings.");
    }
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    await updateWorkspace(ctx.workspaceId, parsed.data);
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "workspace.updated",
      resourceType: "workspace",
      resourceId: ctx.workspaceId,
      metadata: { fields: Object.keys(parsed.data) },
    });
    return Response.json({ workspace: await getWorkspace(ctx.workspaceId) });
  } catch (err) {
    return apiError(err);
  }
}
