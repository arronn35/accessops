import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { ROLES, PERMISSIONS, PERMISSION_MATRIX, type Role } from "@/lib/mock/workspace";
import { allowedRolesForPlan, memberLimitForPlan } from "@/lib/entitlements";
import { countWorkspaceSeats, listWorkspaceMembers } from "@/lib/data/firestore";
import { formatRelative } from "@/lib/utils";
import { InviteSection } from "./invite-section";

export const metadata = { title: "Team & roles — AccessOps AI" };
export const dynamic = "force-dynamic";

const ROLE_TONE: Record<Role, "navy" | "info" | "ai" | "warning" | "neutral" | "success"> = {
  owner: "navy",
  admin: "info",
  developer: "ai",
  auditor: "warning",
  client_viewer: "neutral",
  report_viewer: "success",
};

export default async function TeamPage() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  const canInvite = ctx.member.role === "owner" || ctx.member.role === "admin";
  const [members, seatsUsed] = await Promise.all([
    listWorkspaceMembers(ctx.workspace.id),
    countWorkspaceSeats(ctx.workspace.id),
  ]);
  const planMemberLimit = memberLimitForPlan(ctx.workspace.plan);
  const planAllowedRoles = allowedRolesForPlan(ctx.workspace.plan).filter((r) => r !== "owner");
  const seatsRemaining = Math.max(0, planMemberLimit - seatsUsed);

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 max-w-[1200px]">
      <header>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">Team</p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">Team &amp; roles</h1>
        <p className="text-sm text-ink-600 mt-1">
          {members.length} member(s) in <strong>{ctx.workspace.name}</strong>.{" "}
          {seatsRemaining} of {planMemberLimit} seats remaining on your {ctx.workspace.plan} plan.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Invite teammates</CardTitle>
          <CardDescription>Email invitations are disabled in the Firebase V1 free stack.</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteSection
            canInvite={canInvite}
            allowedRoles={planAllowedRoles}
            seatsRemaining={seatsRemaining}
            planName={ctx.workspace.plan}
            memberLimit={planMemberLimit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Active people in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.memberId}>
                  <td className="py-3">
                    <p className="font-medium text-ink-900">{m.name ?? m.email}</p>
                    <p className="text-xs text-ink-500">{m.email}</p>
                  </td>
                  <td className="py-3">
                    <Badge tone={ROLE_TONE[m.role as Role]} size="sm">
                      {ROLES.find((r) => r.id === m.role)?.label ?? m.role}
                    </Badge>
                  </td>
                  <td className="py-3 text-xs text-ink-600">{formatRelative(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role permissions</CardTitle>
          <CardDescription>What each role can do in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-line">
                {PERMISSIONS.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-3 text-ink-700">{p.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.id} className="py-3 px-2 text-center">
                        {PERMISSION_MATRIX[r.id as Role]?.[p.id] ? (
                          <Check className="size-4 text-green-700 inline" />
                        ) : (
                          <X className="size-4 text-ink-300 inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
