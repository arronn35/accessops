"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const PLANS = [
  { id: "free", name: "Free", price: "€0" },
  { id: "starter", name: "Starter", price: "€39 / mo" },
  { id: "agency", name: "Agency", price: "€129 / mo" },
  { id: "team", name: "Team", price: "€249 / mo" },
  { id: "enterprise", name: "Enterprise", price: "Custom" },
] as const;

const ENTERPRISE_MAILTO =
  "mailto:maitritechco@gmail.com?subject=Percevia%20Enterprise%20inquiry";

export function PlanPicker({
  plan,
  canManage,
  billingEnabled,
  hasSubscription,
}: {
  plan: string;
  canManage: boolean;
  billingEnabled: boolean;
  hasSubscription: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canManage) {
    return (
      <p className="text-sm text-ink-600">
        Only workspace owners or admins can change the plan.
      </p>
    );
  }

  async function choosePlan(target: string) {
    setBusy(target);
    setError(null);
    setInfo(null);
    try {
      if (billingEnabled && target === "free" && hasSubscription) {
        await openPortal();
        return;
      }
      if (billingEnabled && target === "enterprise") {
        window.location.assign(ENTERPRISE_MAILTO);
        return;
      }

      // Paid plans go through Polar checkout; "free" is a direct downgrade.
      if (billingEnabled && target !== "free") {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: target }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          setError(data.message || data.error || "Could not start checkout.");
          setBusy(null);
          return;
        }
        window.location.assign(data.url as string);
        return;
      }

      const res = await fetch("/api/plan/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Could not change plan.");
        setBusy(null);
        return;
      }
      setInfo(`Switched to ${target}.`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.message || data.error || "Could not open the billing portal.");
        setBusy(null);
        return;
      }
      window.location.assign(data.url as string);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-900 text-sm p-3">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-900 text-sm p-3">
          {info}
        </div>
      )}

      <div className="rounded-lg ring-1 ring-line bg-paper p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Switch plan</h2>
            <p className="text-xs text-ink-600 mt-1">
              {billingEnabled
                ? "Choose a paid plan to open secure checkout, or drop to Free."
                : "Pick a plan to apply its limits and permissions to this workspace."}
            </p>
          </div>
          {billingEnabled && hasSubscription && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy !== null}
              onClick={openPortal}
            >
              {busy === "portal" ? "Opening…" : "Manage subscription"}
            </Button>
          )}
        </div>

        <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLANS.map((p) => {
            const isCurrent = plan === p.id;
            const isPaid = p.id !== "free";
            const isSelfServePaid = isPaid && p.id !== "enterprise";
            const isPortalCancellation = billingEnabled && hasSubscription && p.id === "free";
            const label = isCurrent
              ? "Current plan"
              : isPortalCancellation
              ? "Cancel in portal"
              : busy === p.id
              ? billingEnabled && isSelfServePaid
                ? "Opening checkout…"
                : "Switching…"
              : billingEnabled && isSelfServePaid
              ? "Upgrade"
              : billingEnabled && p.id === "enterprise"
              ? "Contact sales"
              : "Choose";
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
                  disabled={isCurrent || busy !== null || pending}
                  onClick={() => choosePlan(p.id)}
                >
                  {label}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
