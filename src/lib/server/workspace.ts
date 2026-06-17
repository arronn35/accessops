/**
 * Server-side helpers used by RSC pages to fetch workspace-scoped data.
 * These mirror what the public API returns, but skip the JSON round-trip
 * for performance.
 */
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/auth/session";
import { getWorkspaceContext } from "@/lib/data/firestore";

export async function getCurrentWorkspaceOrRedirect() {
  const token = await verifySessionCookie().catch(() => null);
  if (!token?.uid) redirect("/auth/sign-in");
  const ctx = await getWorkspaceContext(token.uid);
  if (!ctx) redirect("/onboarding");
  return ctx;
}
