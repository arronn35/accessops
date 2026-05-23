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
      <Download className="size-4" aria-hidden /> Export ZIP
    </a>
  );
}

export function DeleteAllScansButton() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function runDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy/delete-scan-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true, confirm: "DELETE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Could not delete");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AlertCallout tone="success" title="Scan data deleted">
        All scan data for this workspace has been removed.
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
