"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const UPGRADE_PLANS = [
  { id: "starter", name: "Starter", price: "€39 / mo" },
  { id: "agency", name: "Agency", price: "€129 / mo" },
  { id: "team", name: "Team", price: "€249 / mo" },
] as const;

type Plan = string;

export function BillingClient({
  plan,
  hasCustomer,
  hasSubscription,
  canManage,
  billingEnabled,
}: {
  plan: Plan;
  hasCustomer: boolean;
  hasSubscription: boolean;
  canManage: boolean;
  billingEnabled: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(targetPlan: string) {
    setBusy(targetPlan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.message || data.error || "Could not start checkout.");
        setBusy(null);
        return;
      }
      window.location.assign(data.url);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.message || data.error || "Could not open billing portal.");
        setBusy(null);
        return;
      }
      window.location.assign(data.url);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
      setBusy(null);
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-ink-600">
        Only workspace owners or admins can change billing. Ask your owner to
        update the plan.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-900 text-sm p-3">
          {error}
        </div>
      )}

      {hasSubscription && (
        <div className="rounded-lg ring-1 ring-line bg-paper p-5">
          <h2 className="text-sm font-semibold text-ink-900">
            Manage subscription
          </h2>
          <p className="text-xs text-ink-600 mt-1">
            Update payment method, view invoices, change plan, or cancel.
          </p>
          <Button
            onClick={openPortal}
            disabled={!billingEnabled || busy !== null}
            className="mt-3"
          >
            {busy === "portal" ? "Opening…" : "Open billing portal"}
          </Button>
        </div>
      )}

      <div className="rounded-lg ring-1 ring-line bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">
          {hasSubscription ? "Switch plan" : "Upgrade"}
        </h2>
        <p className="text-xs text-ink-600 mt-1">
          Self-serve plans use Stripe Checkout. Enterprise pricing is custom —{" "}
          <a
            href="mailto:sales@maitrico.com"
            className="text-blue-600 hover:underline"
          >
            contact sales
          </a>
          .
        </p>
        <ul className="mt-4 grid sm:grid-cols-3 gap-3">
          {UPGRADE_PLANS.map((p) => {
            const isCurrent = plan === p.id;
            return (
              <li
                key={p.id}
                className="rounded-md ring-1 ring-line p-4 flex flex-col"
              >
                <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                <p className="text-xs text-ink-600 mt-1">{p.price}</p>
                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  size="sm"
                  className="mt-3"
                  disabled={!billingEnabled || isCurrent || busy !== null}
                  onClick={() => startCheckout(p.id)}
                >
                  {isCurrent
                    ? "Current plan"
                    : busy === p.id
                    ? "Redirecting…"
                    : hasCustomer
                    ? "Switch"
                    : "Choose"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-ink-500 leading-relaxed">
        All paid plans are billed via Stripe. By upgrading you agree to our{" "}
        <a href="/legal/terms" className="text-blue-600 hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/legal/privacy" className="text-blue-600 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
