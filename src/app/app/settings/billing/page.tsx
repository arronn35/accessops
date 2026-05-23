import Link from "next/link";
import { getCurrentWorkspaceOrRedirect } from "@/lib/server/workspace";
import { billingConfigured } from "@/lib/billing/stripe";
import { isAdminEmail } from "@/lib/entitlements";
import { BillingClient } from "./billing-client";

export const metadata = { title: "Billing — AccessOps AI" };
export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  agency: "Agency",
  team: "Team",
  enterprise: "Enterprise",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, member, user } = await getCurrentWorkspaceOrRedirect();
  const params = await searchParams;
  const canManage = member.role === "owner" || member.role === "admin";
  const isTesterAdmin = isAdminEmail(user.email);

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
          Billing
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Manage your plan, payment methods, and invoices.
        </p>
      </div>

      {params.status === "success" && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-900 text-sm p-4 mb-6">
          Thanks! Your payment was received. Plan changes can take a moment to
          appear — refresh in a few seconds if the badge below still shows the
          old plan.
        </div>
      )}

      <div className="rounded-lg ring-1 ring-line bg-paper p-6">
        <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
          Current plan
        </p>
        <p className="text-3xl font-semibold tracking-tight text-ink-900 mt-1">
          {PLAN_LABEL[workspace.plan] ?? workspace.plan}
        </p>
        {workspace.stripeCurrentPeriodEnd && (
          <p className="text-xs text-ink-600 mt-2">
            Renews {new Date(workspace.stripeCurrentPeriodEnd).toLocaleDateString()}
          </p>
        )}
        {!billingConfigured() && (
          <p className="text-xs text-amber-700 mt-3">
            Stripe is not configured on this deployment yet. Self-serve billing
            is disabled until <code>STRIPE_SECRET_KEY</code> and price IDs are set.
          </p>
        )}
        {isTesterAdmin && workspace.plan === "enterprise" && (
          <p className="text-xs text-blue-700 mt-3">
            Tester admin entitlement is active. This workspace keeps Enterprise
            limits for QA even without a paid Stripe subscription.
          </p>
        )}
      </div>

      <div className="mt-6">
        <BillingClient
          plan={workspace.plan}
          hasCustomer={Boolean(workspace.stripeCustomerId)}
          hasSubscription={Boolean(workspace.stripeSubscriptionId)}
          canManage={canManage}
          billingEnabled={billingConfigured()}
        />
      </div>
    </div>
  );
}
