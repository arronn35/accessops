"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Pricing-page CTA.
 *
 * Paid plans start a Polar checkout when billing is configured. Local/demo
 * environments without Polar still fall back to direct plan selection.
 */
export function PricingCta({
  planId,
  label,
  highlighted,
}: {
  planId: string;
  label: string;
  highlighted?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (planId === "free") {
    return (
      <a href="/onboarding" className={ctaClasses(highlighted)}>
        {label}
      </a>
    );
  }
  if (planId === "enterprise") {
    return (
      <a
        href="mailto:maitritechco@gmail.com?subject=Percevia%20Enterprise%20inquiry"
        className={ctaClasses(highlighted)}
      >
        {label}
      </a>
    );
  }

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (checkoutRes.status === 401) {
        const cb = encodeURIComponent(`/app/settings/billing?plan=${planId}`);
        window.location.assign(`/auth/sign-in?callbackUrl=${cb}`);
        return;
      }
      const checkoutData = await checkoutRes.json().catch(() => ({}));
      if (checkoutRes.status === 403 && checkoutData.error === "no_workspace") {
        window.location.assign("/onboarding");
        return;
      }
      if (checkoutRes.ok && checkoutData.url) {
        window.location.assign(checkoutData.url as string);
        return;
      }
      if (
        checkoutRes.status !== 503 ||
        checkoutData.error !== "billing_unavailable"
      ) {
        setError(
          checkoutData.message ||
            checkoutData.error ||
            "Could not start checkout."
        );
        setBusy(false);
        return;
      }

      const res = await fetch("/api/plan/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.status === 401) {
        const cb = encodeURIComponent(`/app/settings/billing?plan=${planId}`);
        window.location.assign(`/auth/sign-in?callbackUrl=${cb}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.error === "no_workspace") {
        window.location.assign("/onboarding");
        return;
      }
      if (!res.ok) {
        setError(data.message || data.error || "Could not switch plan.");
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => window.location.assign("/app/settings/billing"), 800);
    } catch (err) {
      setError((err as Error).message ?? "Network error");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={busy || done}
        className={ctaClasses(highlighted)}
      >
        {done ? "Plan activated ✓" : busy ? "Activating…" : label}
      </button>
      {error && (
        <p className="mt-2 text-[11px] text-rose-700 leading-snug">{error}</p>
      )}
    </>
  );
}

function ctaClasses(highlighted: boolean | undefined): string {
  return cn(
    "mt-6 inline-flex w-full items-center justify-center px-4 py-3.5 text-[13px] font-bold",
    // On the dark "most popular" card the CTA inverts to paper.
    highlighted
      ? "bg-paper text-navy-900 hover:bg-canvas-2"
      : "border border-rule bg-transparent text-navy-900 hover:bg-canvas-2",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}
