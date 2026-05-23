/**
 * POST /api/team/invitations/:id/accept
 *
 * The dynamic segment is named `id` to satisfy Next.js' single slug name
 * requirement for sibling dynamic routes, but the value is the invitation
 * token used by /invite/[token].
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  workspaceInvitations,
  workspaceMembers,
  users,
} from "@/lib/db/schema";
import { auth } from "@/auth";
import { apiError, ApiError } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "unauthorized");
    }
    const { id: token } = await params;

    const [invite] = await db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token))
      .limit(1);

    if (!invite) throw new ApiError(404, "not_found");
    if (invite.status !== "pending") {
      throw new ApiError(409, "invite_not_pending", `Invite is ${invite.status}.`);
    }
    if (invite.expiresAt < new Date()) {
      await db
        .update(workspaceInvitations)
        .set({ status: "expired" })
        .where(eq(workspaceInvitations.id, invite.id));
      throw new ApiError(410, "invite_expired");
    }

    const [me] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!me?.email || me.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ApiError(
        403,
        "wrong_account",
        `This invitation is for ${invite.email}. Sign in with that email and try again.`
      );
    }

    const [existing] = await db
      .select({ id: workspaceMembers.id, status: workspaceMembers.status })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.status !== "active") {
        await db
          .update(workspaceMembers)
          .set({ status: "active", role: invite.role, updatedAt: new Date() })
          .where(eq(workspaceMembers.id, existing.id));
      }
    } else {
      await db.insert(workspaceMembers).values({
        workspaceId: invite.workspaceId,
        userId: session.user.id,
        role: invite.role,
        status: "active",
      });
    }

    await db
      .update(workspaceInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByUserId: session.user.id,
      })
      .where(eq(workspaceInvitations.id, invite.id));

    await audit({
      userId: session.user.id,
      workspaceId: invite.workspaceId,
      action: "team.invite_accepted",
      resourceType: "workspace_invitation",
      resourceId: invite.id,
      metadata: { role: invite.role },
    });

    return Response.json({ ok: true, workspaceId: invite.workspaceId });
  } catch (err) {
    return apiError(err);
  }
}
