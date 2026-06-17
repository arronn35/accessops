import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import {
  audit,
  countWorkspaceSeats,
  createWorkspaceInvitation,
  getWorkspace,
  listPendingInvitations,
} from "@/lib/data/firestore";
import { allowedRolesForPlan, memberLimitForPlan, type WorkspaceRole } from "@/lib/entitlements";

const InviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["admin", "developer", "auditor", "client_viewer", "report_viewer"]),
});

export async function GET() {
  try {
    const ctx = await requirePermission("manage_team");
    return Response.json({
      invitations: await listPendingInvitations(ctx.workspaceId),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("manage_team");
    const parsed = InviteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const workspace = await getWorkspace(ctx.workspaceId);
    if (!workspace) throw new ApiError(404, "workspace_not_found");
    const allowed = allowedRolesForPlan(workspace.plan);
    if (!allowed.includes(parsed.data.role as WorkspaceRole)) {
      throw new ApiError(403, "role_not_allowed_for_plan");
    }
    const seatsUsed = await countWorkspaceSeats(ctx.workspaceId);
    if (seatsUsed >= memberLimitForPlan(workspace.plan)) {
      throw new ApiError(409, "seat_limit_reached", "Your plan has no available team seats.");
    }
    const invitation = await createWorkspaceInvitation({
      workspaceId: ctx.workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: ctx.userId,
    });
    const inviteUrl = new URL(`/invite/${invitation.token}`, req.url).toString();
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "team.invite_created",
      resourceType: "workspace_invitation",
      resourceId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    });
    return Response.json(
      {
        ...invitation,
        inviteUrl,
        emailSent: false,
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}
