/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the active workspace and
 * returns `{ url }`. Owners/admins only. The workspace must already have
 * a `stripeCustomerId` (i.e. completed at least one checkout).
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { audit } from "@/lib/api/audit";

export async function POST(req: NextRequest) {
  try {
    if (!billingConfigured()) {
      throw new ApiError(503, "billing_unavailable");
    }
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }

    const [workspace] = await db
      .select({ stripeCustomerId: workspaces.stripeCustomerId })
      .from(workspaces)
      .where(eq(workspaces.id, ctx.workspaceId))
      .limit(1);

    if (!workspace?.stripeCustomerId) {
      throw new ApiError(
        409,
        "no_customer",
        "This workspace has no Stripe customer yet. Start a checkout first."
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.AUTH_URL ??
      new URL(req.url).origin;

    const session = await stripe().billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${appUrl}/app/settings/billing`,
    });

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "billing.portal_opened",
      resourceType: "stripe_customer",
      resourceId: workspace.stripeCustomerId,
    });

    return Response.json({ url: session.url }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
