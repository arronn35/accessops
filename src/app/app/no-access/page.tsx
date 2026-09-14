/**
 * Shown when a signed-in member's role does not carry the permission a page
 * requires (see requirePagePermission). This page is deliberately ungated: it
 * is the destination for roles that hold no permissions at all, so gating it
 * would loop.
 *
 * It names the missing permission and points at the workspace owner rather
 * than pretending the page does not exist — the member is legitimately in the
 * workspace, just not entitled to this surface.
 */
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/empty/EmptyState";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { PERMISSION_LABELS, type WorkspacePermission } from "@/lib/entitlements";

export const metadata = { title: "No access — Percevia AI" };
export const dynamic = "force-dynamic";

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const { need } = await searchParams;
  const ctx = await getCurrentWorkspaceOrRedirect();

  const label =
    need && need in PERMISSION_LABELS
      ? PERMISSION_LABELS[need as WorkspacePermission]
      : null;

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardContent className="py-10">
          <EmptyState
            icon={ShieldAlert}
            tone="neutral"
            title="You don't have access to this page"
            description={
              label
                ? `Your role in this workspace (${ctx.member.role}) does not include "${label}". A workspace owner or admin can change your role.`
                : `Your role in this workspace (${ctx.member.role}) does not include the permission this page requires. A workspace owner or admin can change your role.`
            }
            action={
              <Link
                href="/app/settings"
                className="text-sm font-medium underline underline-offset-4"
              >
                Go to settings
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
