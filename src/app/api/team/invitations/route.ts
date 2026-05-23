/**
 * POST /api/team/invitations    — create + email an invitation
 * GET  /api/team/invitations    — list pending invitations for the workspace
 *
 * Owners/admins only. Roles `owner` cannot be granted via invite
 * (workspace ownership only changes via an owner-transfer flow, which is
 * out of scope here).
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  workspaceInvitations,
  workspaces,
  workspaceMembers,
  users,
} from "@/lib/db/schema";
import {
  apiError,
  ApiError,
  requireSession,
} from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { sendTransactional } from "@/lib/email/resend-client";
import { workspaceInviteEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

const INVITE_TTL_DAYS = 14;

const InviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum([
    "admin",
    "developer",
    "auditor",
    "client_viewer",
    "report_viewer",
  ]),
});

function newToken(): string {
  // 32 random bytes → 43-char base64url. Opaque, not predictable.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden", "Only owners or admins can invite.");
    }
    const body = await req.json().catch(() => ({}));
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input");
    }
    const email = parsed.data.email.trim().toLowerCase();
    const role = parsed.data.role;

    // If this email is already an active member, reject.
    const [existingMember] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, ctx.workspaceId),
          eq(users.email, email),
          eq(workspaceMembers.status, "active")
        )
      )
      .limit(1);

    if (existingMember) {
      throw new ApiError(409, "already_member");
    }

    // If a pending invite already exists, surface it rather than create a dup.
    const [existingInvite] = await db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, ctx.workspaceId),
          eq(workspaceInvitations.email, email),
          eq(workspaceInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvite) {
      throw new ApiError(
        409,
        "invite_exists",
        "An invitation for this email is already pending."
      );
    }

    const [workspace] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);

    const [inviter] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    const token = newToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const [invite] = await db
      .insert(workspaceInvitations)
      .values({
        workspaceId: ctx.workspaceId,
        email,
        role,
        invitedByUserId: ctx.userId,
        token,
        expiresAt,
      })
      .returning({
        id: workspaceInvitations.id,
        token: workspaceInvitations.token,
        expiresAt: workspaceInvitations.expiresAt,
      });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.AUTH_URL ??
      new URL(req.url).origin;
    const acceptUrl = `${appUrl}/invite/${invite.token}`;

    const send = await sendTransactional(
      workspaceInviteEmail({
        to: email,
        workspaceName: workspace?.name ?? "your workspace",
        inviterName: inviter?.name ?? inviter?.email ?? "A teammate",
        inviterEmail: inviter?.email ?? "",
        acceptUrl,
        expiresAt: invite.expiresAt,
      })
    );

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "team.invited",
      resourceType: "workspace_invitation",
      resourceId: invite.id,
      metadata: { email, role, emailSent: send.ok, emailReason: send.reason },
    });

    return Response.json({
      id: invite.id,
      email,
      role,
      expiresAt: invite.expiresAt.toISOString(),
      emailSent: send.ok,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET() {
  try {
    const ctx = await requireSession();
    const rows = await db
      .select({
        id: workspaceInvitations.id,
        email: workspaceInvitations.email,
        role: workspaceInvitations.role,
        status: workspaceInvitations.status,
        createdAt: workspaceInvitations.createdAt,
        expiresAt: workspaceInvitations.expiresAt,
      })
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, ctx.workspaceId),
          eq(workspaceInvitations.status, "pending")
        )
      );
    return Response.json({ invitations: rows });
  } catch (err) {
    return apiError(err);
  }
}
