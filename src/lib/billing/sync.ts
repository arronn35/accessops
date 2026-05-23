/**
 * Reconciles a Stripe subscription into our DB. Called from the webhook
 * handler for every `customer.subscription.{created,updated,deleted}` and
 * `checkout.session.completed` event.
 *
 * Why both workspaces.plan AND usage_limits.plan? Plan-cap reads at the
 * API layer (`src/app/api/scans/route.ts`) hit `usage_limits.plan`, while
 * the dashboard reads `workspaces.plan` for display. Keeping both in sync
 * here lets every other code path stay simple.
 */
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces, usageLimits, users } from "@/lib/db/schema";
import { isAdminEmail, TESTER_ADMIN_PLAN, type PlanTier } from "@/lib/entitlements";
import { planForPriceId } from "@/lib/billing/stripe";
import { audit } from "@/lib/api/audit";

/**
 * Find a workspace by its stored Stripe customer id, or by a metadata
 * fallback shipped on the Checkout session/subscription. We always set
 * `metadata.workspaceId` on outgoing checkout sessions so the very first
 * webhook can resolve the workspace before `stripeCustomerId` is saved.
 */
export async function findWorkspaceForStripeEvent(args: {
  customerId?: string | null;
  metadataWorkspaceId?: string | null;
}): Promise<{ id: string; ownerUserId: string } | null> {
  if (args.metadataWorkspaceId) {
    const [byMeta] = await db
      .select({ id: workspaces.id, ownerUserId: workspaces.ownerUserId })
      .from(workspaces)
      .where(eq(workspaces.id, args.metadataWorkspaceId))
      .limit(1);
    if (byMeta) return byMeta;
  }
  if (args.customerId) {
    const [byCustomer] = await db
      .select({ id: workspaces.id, ownerUserId: workspaces.ownerUserId })
      .from(workspaces)
      .where(eq(workspaces.stripeCustomerId, args.customerId))
      .limit(1);
    if (byCustomer) return byCustomer;
  }
  return null;
}

interface SyncInput {
  workspaceId: string;
  subscription: Stripe.Subscription;
  /** If we haven't persisted the customer id yet (first checkout). */
  customerId?: string | null;
}

/**
 * Idempotent: safe to call multiple times for the same subscription event.
 * Stripe re-delivers webhooks on failure and our event handler will too.
 */
export async function syncSubscriptionToWorkspace({
  workspaceId,
  subscription,
  customerId,
}: SyncInput): Promise<{ plan: PlanTier }> {
  const isActive =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";

  // Pick the first item's price (we only sell one plan per subscription).
  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const mappedPlan = isActive ? planForPriceId(priceId) : null;
  const nextPlan: PlanTier = (await testerAdminPlanForWorkspace(workspaceId)) ?? mappedPlan ?? "free";

  // Stripe API: `current_period_end` lives on the subscription in the
  // SDK version we ship. Newer SDKs surface it per-item via
  // `item.current_period_end` for split-billing scenarios; we don't use
  // those, so the top-level field is the right read.
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await db
    .update(workspaces)
    .set({
      plan: nextPlan,
      stripeCustomerId:
        customerId ??
        (typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null),
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  await db
    .update(usageLimits)
    .set({ plan: nextPlan })
    .where(eq(usageLimits.workspaceId, workspaceId));

  await audit({
    workspaceId,
    action: "billing.subscription_synced",
    resourceType: "stripe_subscription",
    resourceId: subscription.id,
    metadata: {
      plan: nextPlan,
      stripeStatus: subscription.status,
      priceId,
      currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
    },
  });

  return { plan: nextPlan };
}

/**
 * Subscription cancelled / deleted — drop the workspace back to free and
 * clear the subscription fields. Keep `stripeCustomerId` so future
 * checkouts re-use the same customer (preserving payment methods on file).
 */
export async function downgradeWorkspaceToFree(workspaceId: string): Promise<void> {
  const testerPlan = await testerAdminPlanForWorkspace(workspaceId);
  if (testerPlan) {
    await db
      .update(workspaces)
      .set({
        plan: testerPlan,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));

    await db
      .update(usageLimits)
      .set({ plan: testerPlan })
      .where(eq(usageLimits.workspaceId, workspaceId));

    await audit({
      workspaceId,
      action: "billing.subscription_cancelled",
      resourceType: "workspace",
      resourceId: workspaceId,
      metadata: { plan: testerPlan, testerAdminPreserved: true },
    });
    return;
  }

  await db
    .update(workspaces)
    .set({
      plan: "free",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  await db
    .update(usageLimits)
    .set({ plan: "free" })
    .where(eq(usageLimits.workspaceId, workspaceId));

  await audit({
    workspaceId,
    action: "billing.subscription_cancelled",
    resourceType: "workspace",
    resourceId: workspaceId,
    metadata: { plan: "free" },
  });
}

async function testerAdminPlanForWorkspace(workspaceId: string): Promise<PlanTier | null> {
  const [owner] = await db
    .select({ email: users.email })
    .from(workspaces)
    .leftJoin(users, eq(users.id, workspaces.ownerUserId))
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return isAdminEmail(owner?.email) ? TESTER_ADMIN_PLAN : null;
}
