"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Check, Loader2 } from "lucide-react";

/**
 * "Monitor this site" entry point on the scan results page (Layer 2, B-2).
 * Seeds a monitor from the current scan (URL + scan config) at the plan's
 * default cadence, then routes to the monitors dashboard. Surfaces plan-gating
 * errors inline (e.g. monitoring not available on the free plan).
 */
export function MonitorScanButton({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fromScanId: scanId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "Couldn't start monitoring.");
        return;
      }
      setDone(true);
      router.push("/app/monitors");
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={start}
        disabled={busy || done}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : done ? (
          <Check className="size-4 text-green-600" aria-hidden />
        ) : (
          <Activity className="size-4" aria-hidden />
        )}
        {done ? "Monitoring" : "Monitor this site"}
      </button>
      {error && (
        <p className="text-xs text-rose-600 max-w-[240px] text-right">{error}</p>
      )}
    </div>
  );
}
