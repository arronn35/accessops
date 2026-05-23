/**
 * Stripe client + price-id ↔ plan-tier mapping.
 *
 * Configure these env vars in Vercel:
 *   - STRIPE_SECRET_KEY              (sk_test_* / sk_live_*)
 *   - STRIPE_WEBHOOK_SECRET          (whsec_*; from `stripe listen` or dashboard)
 *   - STRIPE_PRICE_STARTER           (price_*)
 *   - STRIPE_PRICE_AGENCY            (price_*)
 *   - STRIPE_PRICE_TEAM              (price_*)
 *
 * Free + Enterprise are not Stripe-mapped. Free is the default plan;
 * Enterprise goes through sales (contact form), not self-serve checkout.
 *
 * `billingConfigured()` lets routes short-circuit with a 503 when keys
 * are missing — useful in preview deploys and dev without leaking a
 * cryptic Stripe SDK error to the user.
 */
import Stripe from "stripe";
import type { PlanTier } from "@/lib/entitlements";

let _client: Stripe | null = null;

export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure billing env vars before invoking Stripe."
    );
  }
  _client = new Stripe(key, {
    // Pin the API version so an SDK upgrade does not silently change
    // webhook payload shape. Update intentionally alongside Stripe SDK bumps.
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return _client;
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function webhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return s;
}

/** Plans buyable via self-serve Stripe Checkout. */
export type CheckoutablePlan = Exclude<PlanTier, "free" | "enterprise">;

const PRICE_ENV: Record<CheckoutablePlan, string> = {
  starter: "STRIPE_PRICE_STARTER",
  agency: "STRIPE_PRICE_AGENCY",
  team: "STRIPE_PRICE_TEAM",
};

export function priceIdForPlan(plan: CheckoutablePlan): string | null {
  const raw = process.env[PRICE_ENV[plan]];
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

/**
 * Inverse lookup: from a price id (as it arrives on a webhook), figure out
 * which internal plan tier it represents. Returns `null` for unknown prices
 * so the webhook handler can ignore one-off invoices or legacy prices.
 */
export function planForPriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null;
  for (const plan of ["starter", "agency", "team"] as const) {
    if (priceIdForPlan(plan) === priceId) return plan;
  }
  return null;
}

export function isCheckoutablePlan(plan: string): plan is CheckoutablePlan {
  return plan === "starter" || plan === "agency" || plan === "team";
}
