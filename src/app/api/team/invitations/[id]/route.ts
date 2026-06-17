import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { audit, revokeWorkspaceInvitation } from "@/lib/data/firestore";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("manage_team");
    const { id } = await params;
    const ok = await revokeWorkspaceInvitation(ctx.workspaceId, id);
    if (!ok) throw new ApiError(404, "not_found");
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "team.invite_revoked",
      resourceType: "workspace_invitation",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
