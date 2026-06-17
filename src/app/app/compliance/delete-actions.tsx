"use client";

import { useState } from "react";
import { Loader2, Trash2, Download } from "lucide-react";
import { AlertCallout } from "@/components/feedback/AlertCallout";

export function ExportWorkspaceButton() {
  return (
    <a
      href="/api/privacy/export-workspace-data"
      className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
    >
      <Download className="size-4" aria-hidden /> Export JSON
    </a>
  );
}

type DeletionPhase = "idle" | "queued" | "completed";

const DELETION_POLL_MS = 2_500;
const DELETION_POLL_LIMIT = 24; // ~1 minute before we stop polling

export function DeleteAllScansButton() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<DeletionPhase>("idle");

  async function pollUntilDone() {
    for (let i = 0; i < DELETION_POLL_LIMIT; i++) {
      await new Promise((resolve) => setTimeout(resolve, DELETION_POLL_MS));
      const res = await fetch("/api/privacy/delete-scan-data").catch(() => null);
      if (!res?.ok) continue;
      const body = await res.json().catch(() => ({}));
      if (body.job?.status === "completed") {
        setPhase("completed");
        return;
      }
      if (body.job?.status === "failed") {
        setError("Deletion did not complete. Please retry or contact support.");
        setPhase("idle");
        return;
      }
    }
    // Still running after the polling window; the job continues server-side.
  }

  async function runDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy/delete-scan-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not delete");
        return;
      }
      setPhase("queued");
      void pollUntilDone();
    } finally {
      setLoading(false);
    }
  }

  if (phase === "completed") {
    return (
      <AlertCallout tone="success" title="Scan data deleted">
        All scan data for this workspace has been removed and verified.
      </AlertCallout>
    );
  }

  if (phase === "queued") {
    return (
      <AlertCallout tone="info" title="Deletion in progress">
        Scan data deletion is running in the background. You can leave this
        page — the audit log will record completion.
      </AlertCallout>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-rose-50 text-rose-700 ring-1 ring-rose-50 text-sm font-medium hover:bg-rose-50/80"
      >
        <Trash2 className="size-4" aria-hidden /> Delete…
      </button>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      <p className="text-xs text-ink-700">
        Type <span className="font-mono font-semibold text-rose-700">DELETE</span> to confirm.
        This removes all scans, pages, issues, AI explanations, and reports in this workspace.
      </p>
      <input
        type="text"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full max-w-xs rounded-md ring-1 ring-line px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
        placeholder="DELETE"
      />
      {error && (
        <AlertCallout tone="danger">{error}</AlertCallout>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="h-10 px-3.5 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
        >
          Cancel
        </button>
        <button
          onClick={runDelete}
          disabled={confirm !== "DELETE" || loading}
          className="h-10 px-3.5 rounded-md bg-rose-500 text-paper text-sm font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
          Delete permanently
        </button>
      </div>
    </div>
  );
}
