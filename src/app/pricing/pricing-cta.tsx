"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Self-serve upgrade CTA used inside the public pricing grid.
 *
 * - Authenticated user: POST /api/billing/checkout → Stripe Checkout.
 * - Unauthenticated: bounce to /auth/sign-in?callbackUrl=/pricing so
 *   they come right back here after sign-in.
 * - Stripe not configured on this deployment: server returns 503 with
 *   `billing_unavailable`; we surface a polite "contact sales" fallback.
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

  // Free always routes to onboarding; Enterprise to a mailto.
  if (planId === "free") {
    return (
      <a
        href="/onboarding"
        className={ctaClasses(highlighted)}
      >
        {label}
      </a>
    );
  }
  if (planId === "enterprise") {
    return (
      <a
        href="mailto:sales@maitrico.com?subject=AccessOps%20Enterprise%20inquiry"
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
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.status === 401) {
        // Not signed in — send them through auth and back.
        const cb = encodeURIComponent(`/app/settings/billing?plan=${planId}`);
        window.location.assign(`/auth/sign-in?callbackUrl=${cb}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.error === "no_workspace") {
        window.location.assign("/onboarding");
        return;
      }
      if (!res.ok || !data.url) {
        setError(
          data.message ||
            data.error ||
            "Self-serve checkout is unavailable right now. Please contact sales."
        );
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
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
        disabled={busy}
        className={ctaClasses(highlighted)}
      >
        {busy ? "Redirecting…" : label}
      </button>
      {error && (
        <p className="mt-2 text-[11px] text-rose-700 leading-snug">{error}</p>
      )}
    </>
  );
}

function ctaClasses(highlighted: boolean | undefined): string {
  return cn(
    "mt-5 inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium w-full",
    highlighted
      ? "bg-navy-900 text-paper hover:bg-navy-800"
      : "ring-1 ring-line bg-paper text-ink-900 hover:bg-canvas-2",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}
