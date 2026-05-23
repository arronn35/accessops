"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, MessageSquarePlus, ShieldQuestion, Plus, Loader2,
} from "lucide-react";

const STATUSES: { id: string; label: string }[] = [
  { id: "to_review", label: "To Review" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In Progress" },
  { id: "needs_human_review", label: "Needs Human Review" },
  { id: "fixed", label: "Fixed" },
  { id: "accepted_risk", label: "Accepted Risk" },
];

export function IssueActions({
  issueId,
  initialStatus,
}: {
  issueId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [taskCreated, setTaskCreated] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    });
  }

  async function createTask() {
    const res = await fetch(`/api/remediation-tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        issueId,
        title: "Address accessibility finding",
        priority: "medium",
        status: "to_review",
      }),
    });
    if (res.ok) {
      setTaskCreated(true);
      setTimeout(() => setTaskCreated(false), 2500);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-start">
      <label className="inline-flex items-center gap-2 text-xs">
        <span className="sr-only">Status</span>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            patch({ status: e.target.value });
          }}
          className="h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-900"
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {pending && <Loader2 className="size-3.5 animate-spin text-ink-500" aria-hidden />}
      </label>

      <button
        type="button"
        onClick={createTask}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
      >
        <Plus className="size-4" aria-hidden /> {taskCreated ? "Task created" : "Create task"}
      </button>

      <button
        type="button"
        onClick={() => patch({ status: "fixed" })}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
      >
        <CheckCircle2 className="size-4" aria-hidden /> Mark fixed
      </button>

      <button
        type="button"
        onClick={() => patch({ falsePositive: true, status: "false_positive" })}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
      >
        <ShieldQuestion className="size-4" aria-hidden /> False positive
      </button>

      <button
        type="button"
        onClick={() => patch({ humanReviewRequired: true })}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm font-medium text-ink-700 hover:bg-canvas-2"
      >
        <MessageSquarePlus className="size-4" aria-hidden /> Flag for review
      </button>
    </div>
  );
}
