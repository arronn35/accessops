import Link from "next/link";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { isAdminEmail, memberLimitForPlan, scanCapsForPlan } from "@/lib/entitlements";
import { PlanPicker } from "./plan-picker";

export const metadata = { title: "Plan — AccessOps AI" };
export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  agency: "Agency",
  team: "Team",
  enterprise: "Enterprise",
};

export default async function BillingPage() {
  const { workspace, member, user } = await getCurrentWorkspaceOrRedirect();
  const canManage = member.role === "owner" || member.role === "admin";
  const isTesterAdmin = isAdminEmail(user.email);
  const caps = scanCapsForPlan(workspace.plan);
  const memberLimit = memberLimitForPlan(workspace.plan);

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          href="/app/settings"
          className="text-xs text-ink-500 hover:text-ink-700"
        >
          ← Settings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 mt-2">
          Plan
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Manage which subscription tier this workspace is on.
        </p>
      </div>

      <div className="rounded-lg ring-1 ring-line bg-paper p-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
          Current plan
        </p>
        <p className="text-3xl font-semibold tracking-tight text-ink-900 mt-1">
          {PLAN_LABEL[workspace.plan] ?? workspace.plan}
        </p>
        <ul className="text-xs text-ink-600 mt-3 space-y-1">
          <li>Up to {memberLimit} team members</li>
          <li>{caps.dailyScanCap} scans / day · {caps.maxPagesCap} pages / scan</li>
        </ul>
        {isTesterAdmin && workspace.plan === "enterprise" && (
          <p className="text-xs text-blue-700 mt-3">
            Tester admin entitlement is active. This workspace keeps Enterprise
            limits for QA.
          </p>
        )}
      </div>

      <div className="mt-6">
        <PlanPicker plan={workspace.plan} canManage={canManage} />
      </div>

      <p className="text-xs text-ink-500 leading-relaxed mt-6">
        Payment processing is being rebuilt. For now, plan changes take effect
        immediately. Billing will be reconnected later.
      </p>
    </div>
  );
}
