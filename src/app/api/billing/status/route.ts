/**
 * GET /api/billing/status
 *
 * Lightweight read for the billing page + nav badge. Returns the
 * workspace's current plan, Stripe linkage state, and the next renewal
 * date if a subscription exists. Any authenticated member of the
 * workspace can read this.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { apiError, requireSession } from "@/lib/api/context";
import { billingConfigured } from "@/lib/billing/stripe";

export async function GET() {
  try {
    const ctx = await requireSession();
    const [ws] = await db
      .select({
        plan: workspaces.plan,
        stripeCustomerId: workspaces.stripeCustomerId,
        stripeSubscriptionId: workspaces.stripeSubscriptionId,
        stripePriceId: workspaces.stripePriceId,
        stripeCurrentPeriodEnd: workspaces.stripeCurrentPeriodEnd,
      })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);

    return Response.json({
      plan: ws?.plan ?? "free",
      hasCustomer: Boolean(ws?.stripeCustomerId),
      hasSubscription: Boolean(ws?.stripeSubscriptionId),
      priceId: ws?.stripePriceId ?? null,
      currentPeriodEnd: ws?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      billingConfigured: billingConfigured(),
    });
  } catch (err) {
    return apiError(err);
  }
}
