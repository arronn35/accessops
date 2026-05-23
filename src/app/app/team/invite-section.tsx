"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2 } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "auditor", label: "Auditor" },
  { value: "client_viewer", label: "Client viewer" },
  { value: "report_viewer", label: "Report viewer" },
];

/**
 * Invite UI for the Team page. Owners/admins only — the page renders
 * this conditionally. State is purely client-side; on mount we GET the
 * pending list, on submit we POST and prepend the new row, on revoke we
 * DELETE and filter the list. Everything else (membership rows in the
 * Members table above) stays server-rendered.
 */
export function InviteSection({ canInvite }: { canInvite: boolean }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/team/invitations");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setInvites(data.invitations ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Could not send invitation.");
        setBusy(false);
        return;
      }
      setInvites((prev) => [
        {
          id: data.id,
          email: data.email,
          role: data.role,
          status: "pending",
          createdAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
        },
        ...prev,
      ]);
      setEmail("");
      setInfo(
        data.emailSent
          ? `Invite emailed to ${data.email}.`
          : `Invite created for ${data.email}. Email delivery was not configured, so share the link with them manually.`
      );
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || "Could not revoke invitation.");
        return;
      }
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    }
  }

  if (!canInvite) {
    return (
      <p className="text-xs text-ink-500">
        Ask a workspace owner or admin to send invitations.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={submit}
        className="grid sm:grid-cols-[1fr_180px_auto] gap-2 items-end"
      >
        <div>
          <label
            htmlFor="invite-email"
            className="block text-xs font-semibold text-ink-700 mb-1"
          >
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="w-full h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="invite-role"
            className="block text-xs font-semibold text-ink-700 mb-1"
          >
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-10 px-2 rounded-md ring-1 ring-line bg-paper text-sm"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
        >
          <Mail className="size-4" aria-hidden />
          {busy ? "Sending…" : "Send invite"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-900 text-xs p-3">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-900 text-xs p-3">
          {info}
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
          Pending invitations
        </h3>
        {loading ? (
          <p className="text-xs text-ink-500">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="text-xs text-ink-500">No pending invitations.</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-md ring-1 ring-line bg-paper px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 truncate">{inv.email}</p>
                  <p className="text-xs text-ink-500">
                    {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(inv.id)}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md ring-1 ring-line text-xs text-ink-700 hover:bg-canvas-2"
                  aria-label={`Revoke invite for ${inv.email}`}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
