import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, updateWorkspace } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

const Body = z.object({ plan: z.enum(["free", "starter", "agency", "team", "enterprise"]) });

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    if (!roleHasPermission(ctx.role, "manage_billing")) throw new ApiError(403, "forbidden");
    await updateWorkspace(ctx.workspaceId, { plan: parsed.data.plan });
    await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "plan.selected", resourceType: "workspace", resourceId: ctx.workspaceId, metadata: parsed.data });
    return Response.json({ ok: true, plan: parsed.data.plan });
  } catch (err) {
    return apiError(err);
  }
}
