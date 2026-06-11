import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, findIssueInWorkspace } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_scans")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const found = await findIssueInWorkspace(ctx.workspaceId, id);
    if (!found) throw new ApiError(404, "not_found");
    return Response.json(found);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "manage_remediation")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "issue.updated", resourceType: "issue", resourceId: id, metadata: await req.json().catch(() => ({})) });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
