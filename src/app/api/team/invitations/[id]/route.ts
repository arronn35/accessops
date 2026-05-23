/**
 * DELETE /api/team/invitations/:id — revoke a pending invitation.
 * Owners/admins only. Idempotent — already-revoked invites return 200.
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaceInvitations } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }
    const { id } = await params;

    const [invite] = await db
      .select({
        id: workspaceInvitations.id,
        workspaceId: workspaceInvitations.workspaceId,
        email: workspaceInvitations.email,
        status: workspaceInvitations.status,
      })
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, id))
      .limit(1);

    if (!invite || invite.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }

    if (invite.status === "pending") {
      await db
        .update(workspaceInvitations)
        .set({ status: "revoked" })
        .where(
          and(
            eq(workspaceInvitations.id, id),
            eq(workspaceInvitations.status, "pending")
          )
        );
      await audit({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        action: "team.invite_revoked",
        resourceType: "workspace_invitation",
        resourceId: id,
        metadata: { email: invite.email },
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
