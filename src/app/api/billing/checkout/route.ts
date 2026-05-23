/**
 * POST /api/billing/checkout
 *
 * Body: { plan: "starter" | "agency" | "team" }
 *
 * Creates a Stripe Checkout Session for the active workspace and returns
 * `{ url }` for the client to redirect to. Owners/admins only — billing
 * actions are workspace-scoped privileged operations.
 *
 * Re-uses the workspace's existing `stripeCustomerId` if present, so a
 * user can upgrade/downgrade without orphaning payment methods.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaces, users } from "@/lib/db/schema";
import {
  apiError,
  ApiError,
  requireSession,
} from "@/lib/api/context";
import {
  billingConfigured,
  isCheckoutablePlan,
  priceIdForPlan,
  stripe,
} from "@/lib/billing/stripe";
import { audit } from "@/lib/api/audit";

const BodySchema = z.object({
  plan: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    if (!billingConfigured()) {
      throw new ApiError(503, "billing_unavailable", "Stripe is not configured on this deployment.");
    }
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden", "Only owners or admins can manage billing.");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input");
    }
    const plan = parsed.data.plan;
    if (!isCheckoutablePlan(plan)) {
      throw new ApiError(400, "unsupported_plan", `Plan "${plan}" is not self-serve.`);
    }
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      throw new ApiError(
        503,
        "price_unconfigured",
        `STRIPE_PRICE_${plan.toUpperCase()} is not set.`
      );
    }

    const [workspace] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        stripeCustomerId: workspaces.stripeCustomerId,
      })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);
    if (!workspace) {
      throw new ApiError(404, "workspace_not_found");
    }

    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.AUTH_URL ??
      new URL(req.url).origin;

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/settings/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?status=cancelled`,
      // Pass workspace and user context so the webhook can reconcile even
      // before stripeCustomerId is persisted on the workspace row.
      client_reference_id: workspace.id,
      customer: workspace.stripeCustomerId ?? undefined,
      customer_email: workspace.stripeCustomerId ? undefined : user?.email,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: false },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
          userId: ctx.userId,
          plan,
        },
      },
      metadata: {
        workspaceId: workspace.id,
        userId: ctx.userId,
        plan,
      },
    });

    await audit({
      userId: ctx.userId,
      workspaceId: workspace.id,
      action: "billing.checkout_started",
      resourceType: "stripe_checkout_session",
      resourceId: session.id,
      metadata: { plan, priceId },
    });

    if (!session.url) {
      throw new ApiError(500, "no_checkout_url");
    }
    return Response.json({ url: session.url }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
