import { apiError, ApiError, requireSession } from "@/lib/api/context";
import {
  acceptWorkspaceInvitation,
  audit,
  getWorkspaceContext,
} from "@/lib/data/firestore";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const current = await getWorkspaceContext(ctx.userId);
    if (!current?.user.email) throw new ApiError(403, "user_email_required");
    const { id } = await params;
    let invitation;
    try {
      invitation = await acceptWorkspaceInvitation({
        token: id,
        userId: ctx.userId,
        email: current.user.email,
      });
    } catch (err) {
      const message = (err as Error).message;
      if (message === "invite_email_mismatch") {
        throw new ApiError(403, message, "Sign in with the email address that was invited.");
      }
      if (message === "invite_expired") throw new ApiError(410, message);
      throw new ApiError(404, message);
    }
    await audit({
      userId: ctx.userId,
      workspaceId: invitation.workspaceId,
      action: "team.invite_accepted",
      resourceType: "workspace_invitation",
      resourceId: invitation.id,
    });
    return Response.json({ ok: true, workspaceId: invitation.workspaceId });
  } catch (err) {
    return apiError(err);
  }
}
