/**
 * Polar (polar.sh) billing integration — server-only.
 *
 * Polar is the Merchant of Record: it hosts checkout, runs the customer portal,
 * and tells us about subscription changes via webhooks. We never store card
 * data. The only thing that mutates a workspace's plan in production is a
 * verified Polar webhook (see /api/billing/webhook) — the client can no longer
 * flip its own plan flag.
 *
 * Config (all from env / Vercel secrets, never committed):
 *   POLAR_ACCESS_TOKEN     Organization Access Token (secret)
 *   POLAR_WEBHOOK_SECRET   Webhook signing secret (secret)
 *   POLAR_ORGANIZATION_ID  Polar organization id (ops/reference)
 *   POLAR_SERVER           "sandbox" (default) | "production"
 *   POLAR_PRODUCT_STARTER  product id for each paid tier
 *   POLAR_PRODUCT_AGENCY
 *   POLAR_PRODUCT_TEAM
 *   POLAR_PRODUCT_ENTERPRISE
 */
import { Polar } from "@polar-sh/sdk";
import type { PlanTier } from "@/lib/entitlements";

export type PaidPlan = Exclude<PlanTier, "free">;

const PRODUCT_ENV: Record<PaidPlan, string> = {
  starter: "POLAR_PRODUCT_STARTER",
  agency: "POLAR_PRODUCT_AGENCY",
  team: "POLAR_PRODUCT_TEAM",
  enterprise: "POLAR_PRODUCT_ENTERPRISE",
};

export function polarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function polarConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN);
}

/** Throws if the access token is missing — callers guard with polarConfigured(). */
export function polarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not set");
  }
  return new Polar({ accessToken, server: polarServer() });
}

/** Polar product id configured for a paid plan, or null if unset. */
export function productIdForPlan(plan: PaidPlan): string | null {
  return process.env[PRODUCT_ENV[plan]] || null;
}

/**
 * Reverse map a Polar product id back to our plan tier. Returns null for an
 * unknown product (e.g. a product that exists in Polar but isn't wired to a
 * tier) so the webhook can ignore it rather than mis-assign a plan.
 */
export function planForProductId(productId: string | null | undefined): PaidPlan | null {
  if (!productId) return null;
  for (const plan of Object.keys(PRODUCT_ENV) as PaidPlan[]) {
    if (productIdForPlan(plan) === productId) return plan;
  }
  return null;
}

/** Which Polar subscription statuses grant the paid entitlement. */
export function isEntitledStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
