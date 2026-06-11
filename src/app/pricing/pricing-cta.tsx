"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Pricing-page CTA.
 *
 * Payment processing has been removed; selecting a plan grants the
 * workspace access to that tier immediately. If the visitor isn't
 * signed in we send them to sign-in with a callback URL that resumes
 * the plan selection after they authenticate.
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
        href="mailto:maitritechco@gmail.com?subject=AccessOps%20Enterprise%20inquiry"
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
    "mt-5 inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium w-full",
    highlighted
      ? "bg-navy-900 text-paper hover:bg-navy-800"
      : "ring-1 ring-line bg-paper text-ink-900 hover:bg-canvas-2",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}
