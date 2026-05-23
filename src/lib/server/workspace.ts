/**
 * Server-side helpers used by RSC pages to fetch workspace-scoped data.
 * These mirror what the public API returns, but skip the JSON round-trip
 * for performance.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  workspaces,
  workspaceMembers,
  privacySettings,
  usageLimits,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getCurrentWorkspaceOrRedirect() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/sign-in");
  if (!session.user.workspaceId) redirect("/onboarding");

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, session.user.workspaceId))
    .limit(1);
  if (!ws) redirect("/onboarding");

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, session.user.id),
        eq(workspaceMembers.workspaceId, ws.id)
      )
    )
    .limit(1);
  if (!member || member.status !== "active") redirect("/auth/sign-in");

  const [privacy] = await db
    .select()
    .from(privacySettings)
    .where(eq(privacySettings.workspaceId, ws.id))
    .limit(1);

  const [limits] = await db
    .select()
    .from(usageLimits)
    .where(eq(usageLimits.workspaceId, ws.id))
    .limit(1);

  return {
    userId: session.user.id,
    user: session.user,
    workspace: ws,
    member,
    privacy,
    limits,
  };
}
