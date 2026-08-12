import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import { getUser, getWorkspace } from "@/lib/data/firestore";
import {
  polarClient,
  polarConfigured,
  productIdForPlan,
  type PaidPlan,
} from "@/lib/billing/polar";

/**
 * Create a Polar checkout session for a paid plan and return its hosted URL.
 * The workspace is linked via `externalCustomerId` so the webhook can map the
 * resulting subscription back to us without trusting any client input.
 */
const Body = z.object({
  plan: z.enum(["starter", "agency", "team", "enterprise"]),
});

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://percevia-chi.vercel.app"
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function billingTestEmails(): string[] {
  return (process.env.BILLING_TEST_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

function isBillingTestEmail(email: string | null | undefined): boolean {
  return Boolean(email && billingTestEmails().includes(normalizeEmail(email)));
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("manage_billing");
    if (!polarConfigured()) {
      throw new ApiError(503, "billing_unavailable", "Billing is not configured.");
    }
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const plan = parsed.data.plan as PaidPlan;

    const productId = productIdForPlan(plan);
    if (!productId) {
      throw new ApiError(400, "plan_not_purchasable", "That plan is not available for self-service checkout.");
    }

    const workspace = await getWorkspace(ctx.workspaceId);
    if (!workspace) throw new ApiError(404, "workspace_not_found");
    const user = await getUser(ctx.userId);
    const isBillingTestCheckout = isBillingTestEmail(user?.email);

    const checkout = await polarClient().checkouts.create({
      products: [productId],
      currency: "eur",
      prices: isBillingTestCheckout
        ? {
            [productId]: [
              { amountType: "free", priceCurrency: "usd" },
              { amountType: "free", priceCurrency: "eur" },
            ],
          }
        : undefined,
      // Link the Polar customer to our workspace; the webhook reads this back.
      externalCustomerId: ctx.workspaceId,
      metadata: {
        workspaceId: ctx.workspaceId,
        plan,
        billingTest: isBillingTestCheckout,
      },
      successUrl: `${appUrl()}/app/settings/billing?checkout=success`,
    });

    return Response.json({ url: checkout.url });
  } catch (err) {
    return apiError(err);
  }
}
