import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import {
  findWorkspaceByPolarCustomerId,
  updateWorkspaceBilling,
} from "@/lib/data/firestore";
import { planForProductId, isEntitledStatus } from "@/lib/billing/polar";
import { captureException } from "@/lib/observability";

/**
 * The subset of the Polar Subscription payload we read. Typed structurally
 * (rather than importing the SDK's component type, which isn't exposed on a
 * stable subpath) so the SDK's real Subscription is assignable to it.
 */
type PolarSubscription = {
  id: string;
  status: string;
  productId: string | null;
  customerId: string;
  customer?: { externalId?: string | null } | null;
  currentPeriodEnd?: Date | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Polar webhook receiver. This is the ONLY path that changes a workspace's paid
 * plan in production — the client cannot self-upgrade. Every request is
 * signature-verified; an invalid signature returns 403 and writes nothing.
 */
export const dynamic = "force-dynamic";

/** Resolve our workspace id from a subscription payload, most-trusted first. */
async function resolveWorkspaceId(sub: PolarSubscription): Promise<string | null> {
  if (sub.customer?.externalId) return sub.customer.externalId;
  const fromMeta = sub.metadata?.workspaceId;
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  if (sub.customerId) {
    const ws = await findWorkspaceByPolarCustomerId(sub.customerId);
    if (ws) return ws.id;
  }
  return null;
}

async function applySubscription(sub: PolarSubscription): Promise<void> {
  const workspaceId = await resolveWorkspaceId(sub);
  if (!workspaceId) {
    console.warn("[polar] subscription event with no resolvable workspace", {
      subscriptionId: sub.id,
      customerId: sub.customerId,
    });
    return;
  }

  const entitled = isEntitledStatus(sub.status);
  const mappedPlan = planForProductId(sub.productId);

  // An active subscription for a product we don't recognize: don't guess a tier
  // (that could over- or under-grant). Record the status but leave plan as-is.
  if (entitled && !mappedPlan) {
    console.warn("[polar] active subscription for unmapped product", {
      productId: sub.productId,
      subscriptionId: sub.id,
    });
    await updateWorkspaceBilling(workspaceId, {
      polarCustomerId: sub.customerId,
      polarSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
    });
    return;
  }

  await updateWorkspaceBilling(workspaceId, {
    // Entitled → mapped tier; otherwise drop to free.
    plan: entitled && mappedPlan ? mappedPlan : "free",
    polarCustomerId: sub.customerId,
    polarSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers);

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET ?? "");
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return new Response("", { status: 403 });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active":
      case "subscription.canceled":
      case "subscription.revoked":
        await applySubscription(event.data);
        break;
      default:
        // Other events (orders, checkouts, …) need no entitlement change.
        break;
    }
  } catch (err) {
    // Don't 500 Polar into endless retries on a transient write error we've
    // already logged; report it and acknowledge. Polar still retries on 5xx if
    // we ever choose to surface one.
    captureException(err, { scope: "polar-webhook" });
    return new Response("", { status: 500 });
  }

  return Response.json({ received: true });
}
