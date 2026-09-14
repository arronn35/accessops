/**
 * Server-side helpers used by RSC pages to fetch workspace-scoped data.
 * These mirror what the public API returns, but skip the JSON round-trip
 * for performance.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/auth/session";
import { getWorkspaceContext } from "@/lib/data/firestore";
import { roleHasPermission, type WorkspacePermission } from "@/lib/entitlements";
import { signInUrlFor } from "@/lib/auth/callback-url";

export async function getCurrentWorkspaceOrRedirect() {
  const token = await verifySessionCookie().catch(() => null);
  if (!token?.uid) {
    // Carry the destination through sign-in. A session expiring mid-task used
    // to land the user on the dashboard with their deep link lost.
    const pathname = (await headers()).get("x-pathname");
    redirect(signInUrlFor(pathname));
  }
  const ctx = await getWorkspaceContext(token.uid);
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/**
 * Workspace context for a page, gated on a role permission.
 *
 * getCurrentWorkspaceOrRedirect() only proves "signed in, and a member of this
 * workspace" — it says nothing about the caller's role. RSC pages read findings
 * straight from Firestore, so without this a report_viewer could still read a
 * scan by navigating to its page even though every API that serves the same
 * data returns 403. Use this instead whenever a page renders workspace data
 * that a role is not entitled to see.
 *
 * Denials go to /app/no-access rather than the dashboard: the dashboard is
 * itself gated, so redirecting there would loop for a role that holds no
 * permissions at all.
 */
export async function requirePagePermission(permission: WorkspacePermission) {
  const ctx = await getCurrentWorkspaceOrRedirect();
  if (!roleHasPermission(ctx.member.role, permission)) {
    redirect(`/app/no-access?need=${encodeURIComponent(permission)}`);
  }
  return ctx;
}
