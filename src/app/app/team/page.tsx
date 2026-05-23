import { eq } from "drizzle-orm";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/db";
import { workspaceMembers, users } from "@/lib/db/schema";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import {
  ROLES,
  PERMISSIONS,
  PERMISSION_MATRIX,
  type Role,
} from "@/lib/mock/workspace";
import { cn, formatRelative } from "@/lib/utils";
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

  const members = await db
    .select({
      memberId: workspaceMembers.id,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      createdAt: workspaceMembers.createdAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(workspaceMembers)
    .leftJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, ctx.workspace.id));

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 max-w-[1200px]">
      <header>
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-1">
          Team
        </p>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Team &amp; roles
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          {members.length} member(s) in <strong>{ctx.workspace.name}</strong>.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Invite teammates</CardTitle>
          <CardDescription>
            Send an email invitation. Invitees pick the role you choose and
            need to sign in with the invited address to accept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteSection canInvite={canInvite} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Active people in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-ink-500 border-b border-line">
                <tr>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {members.map((m) => {
                  const initials = (m.name ?? m.email ?? "?")
                    .split(/[\s@.]/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join("");
                  return (
                    <tr key={m.memberId}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "size-9 rounded-full inline-flex items-center justify-center text-xs font-semibold bg-purple-100 text-purple-600"
                            )}
                          >
                            {initials || "·"}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900">{m.name ?? "Pending"}</p>
                            <p className="text-xs text-ink-500 truncate max-w-[260px]">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={ROLE_TONE[m.role as Role]} size="sm">
                          {ROLES.find((r) => r.id === m.role)?.label ?? m.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-ink-600">
                        {formatRelative(m.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role permissions</CardTitle>
          <CardDescription>
            What each role can do in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 pr-3 text-[11px] font-medium uppercase tracking-wider text-ink-500">
                    Permission
                  </th>
                  {ROLES.map((r) => (
                    <th
                      key={r.id}
                      className="pb-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-ink-500"
                    >
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PERMISSIONS.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3 font-medium text-ink-900">{p.label}</td>
                    {ROLES.map((r) => {
                      const allowed = PERMISSION_MATRIX[r.id][p.id];
                      return (
                        <td key={r.id} className="py-2.5 px-2 text-center">
                          {allowed ? (
                            <Check className="size-4 text-green-700 inline" aria-label="Yes" />
                          ) : (
                            <X className="size-4 text-ink-300 inline" aria-label="No" />
                          )}
                        </td>
                      );
                    })}
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
