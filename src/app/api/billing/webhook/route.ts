/**
 * POST /api/billing/webhook
 *
 * Stripe → us. Verifies the signature with STRIPE_WEBHOOK_SECRET and
 * fans out to the sync helpers. We acknowledge with 2xx as fast as
 * possible; Stripe retries on non-2xx for up to 3 days.
 *
 * Events handled:
 *   - checkout.session.completed                 — first link of customer → workspace
 *   - customer.subscription.created / updated    — plan or status change
 *   - customer.subscription.deleted              — full cancellation
 *   - invoice.payment_failed                     — audit-only (no plan change yet;
 *                                                  Stripe still gives the customer
 *                                                  time to retry before the sub
 *                                                  transitions to past_due or
 *                                                  unpaid)
 *
 * Notes for Next.js 16: route handlers receive a Web `Request`, so we
 * read the raw body via `req.text()` for signature verification. Do not
 * read `req.json()` first — that consumes the body and breaks the
 * signature check.
 */
import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, webhookSecret, billingConfigured } from "@/lib/billing/stripe";
import {
  findWorkspaceForStripeEvent,
  syncSubscriptionToWorkspace,
  downgradeWorkspaceToFree,
} from "@/lib/billing/sync";
import { audit } from "@/lib/api/audit";
import { captureException } from "@/lib/observability";

// Force Node.js runtime — stripe SDK + raw body parsing prefer Node.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!billingConfigured()) {
    return new Response("billing_unavailable", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing_signature", { status: 400 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new Response("bad_body", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch (err) {
    // Likely signature mismatch — refuse loudly so Stripe re-delivers.
    console.error("[billing.webhook] signature verification failed", err);
    return new Response("bad_signature", { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    void captureException(err, { scope: "billing.webhook", eventType: event.type });
    // 5xx so Stripe retries; the platform handles delivery for us.
    return new Response("handler_error", { status: 500 });
  }

  return Response.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId =
        (session.metadata?.workspaceId as string | undefined) ??
        (session.client_reference_id as string | undefined) ??
        null;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      const ws = await findWorkspaceForStripeEvent({
        customerId,
        metadataWorkspaceId: workspaceId,
      });
      if (!ws) {
        console.warn(
          "[billing.webhook] checkout.session.completed: workspace not found",
          { workspaceId, customerId }
        );
        return;
      }
      if (typeof session.subscription === "string") {
        const sub = await stripe().subscriptions.retrieve(session.subscription);
        await syncSubscriptionToWorkspace({
          workspaceId: ws.id,
          subscription: sub,
          customerId,
        });
      }
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const ws = await findWorkspaceForStripeEvent({
        customerId,
        metadataWorkspaceId: (sub.metadata?.workspaceId as string | undefined) ?? null,
      });
      if (!ws) {
        console.warn("[billing.webhook] subscription event: workspace not found", {
          customerId,
          subscriptionId: sub.id,
        });
        return;
      }
      await syncSubscriptionToWorkspace({
        workspaceId: ws.id,
        subscription: sub,
        customerId,
      });
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const ws = await findWorkspaceForStripeEvent({
        customerId,
        metadataWorkspaceId: (sub.metadata?.workspaceId as string | undefined) ?? null,
      });
      if (!ws) return;
      await downgradeWorkspaceToFree(ws.id);
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const ws = await findWorkspaceForStripeEvent({
        customerId,
        metadataWorkspaceId: null,
      });
      if (!ws) return;
      await audit({
        workspaceId: ws.id,
        action: "billing.payment_failed",
        resourceType: "stripe_invoice",
        resourceId: invoice.id,
        metadata: {
          amountDue: invoice.amount_due,
          currency: invoice.currency,
          attemptCount: invoice.attempt_count,
        },
      });
      return;
    }

    default:
      // Unhandled event — ack quietly so Stripe stops retrying.
      return;
  }
}
