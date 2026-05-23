"use client";

import { useState } from "react";

export function AcceptInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/team/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || data.error || "Could not accept invitation.");
        setBusy(false);
        return;
      }
      // Hard navigate so the next page sees the new workspace membership
      // (session callbacks recompute workspaceId on next request).
      window.location.assign("/app");
    } catch (e) {
      setErr((e as Error).message ?? "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="inline-flex h-11 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium items-center justify-center disabled:opacity-50"
      >
        {busy ? "Accepting…" : "Accept invitation"}
      </button>
      {err && <p className="text-xs text-rose-700 mt-3">{err}</p>}
    </div>
  );
}
