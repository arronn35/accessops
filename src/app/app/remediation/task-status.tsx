"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const STATUSES: { id: string; label: string }[] = [
  { id: "to_do", label: "To do" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "fixed", label: "Fixed" },
  { id: "accepted_risk", label: "Accepted risk" },
];

/** Inline status editor for a remediation task card. */
export function TaskStatusControl({
  taskId,
  status: initialStatus,
}: {
  taskId: string;
  status: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function update(next: string) {
    const previous = status;
    setStatus(next);
    setError(false);
    startTransition(async () => {
      const res = await fetch(`/api/remediation-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setStatus(previous);
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <label className="sr-only" htmlFor={`task-status-${taskId}`}>
        Task status
      </label>
      <select
        id={`task-status-${taskId}`}
        value={status}
        onChange={(e) => update(e.target.value)}
        disabled={pending}
        className="h-8 rounded-md ring-1 ring-line bg-paper px-2 text-xs font-medium text-ink-900 disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-3 animate-spin text-ink-500" aria-hidden />}
      {error && <span className="text-[11px] text-rose-700">Save failed</span>}
    </span>
  );
}
