"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Pause,
  Play,
  Plus,
  Trash2,
  Loader2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import type { MonitorFrequency, MonitorStatus } from "@/lib/data/types";

export interface MonitorRow {
  id: string;
  name: string;
  targetUrl: string;
  frequency: MonitorFrequency;
  status: MonitorStatus;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastScanId: string | null;
}

const FREQUENCY_LABEL: Record<MonitorFrequency, string> = {
  daily: "Daily",
  every_3_days: "Every 3 days",
  weekly: "Weekly",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MonitorsManager({
  monitors,
  maxMonitors,
  allowedFrequencies,
}: {
  monitors: MonitorRow[];
  maxMonitors: number;
  allowedFrequencies: MonitorFrequency[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [frequency, setFrequency] = useState<MonitorFrequency>(
    allowedFrequencies[allowedFrequencies.length - 1] ?? "weekly"
  );
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atCap = monitors.length >= maxMonitors;

  async function addMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || adding || atCap) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUrl: url.trim(), frequency }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Couldn't create the monitor.");
        return;
      }
      setUrl("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message ?? "Network error");
    } finally {
      setAdding(false);
    }
  }

  async function toggleStatus(m: MonitorRow) {
    setBusyId(m.id);
    setError(null);
    try {
      const next: MonitorStatus = m.status === "active" ? "paused" : "active";
      const res = await fetch(`/api/monitors/${m.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Couldn't update the monitor.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m: MonitorRow) {
    if (!confirm(`Stop monitoring ${m.name}? This can't be undone.`)) return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/monitors/${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Couldn't delete the monitor.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add monitor */}
      <form
        onSubmit={addMonitor}
        className="rounded-lg ring-1 ring-line bg-paper p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Label htmlFor="monitor-url">Website URL</Label>
            <Input
              id="monitor-url"
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={atCap}
            />
          </div>
          <div className="sm:w-44">
            <Label htmlFor="monitor-frequency">Frequency</Label>
            <select
              id="monitor-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as MonitorFrequency)}
              disabled={atCap}
              className="h-11 w-full rounded-md ring-1 ring-line bg-paper px-3 text-sm text-ink-900 disabled:opacity-60"
            >
              {allowedFrequencies.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={adding || atCap || !url.trim()}>
            {adding ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Add monitor
          </Button>
        </div>
        <p className="text-xs text-ink-500">
          {atCap
            ? `You've reached your plan's limit of ${maxMonitors} monitor${maxMonitors === 1 ? "" : "s"}.`
            : `${monitors.length} of ${maxMonitors} monitors used. Monitoring re-scans the site automatically and alerts you to new critical issues or score drops.`}
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      {/* List */}
      {monitors.length === 0 ? (
        <div className="rounded-lg ring-1 ring-line bg-canvas-2 p-8 text-center">
          <Activity className="size-6 text-ink-400 mx-auto mb-2" aria-hidden />
          <p className="text-sm font-medium text-ink-800">No monitors yet</p>
          <p className="text-sm text-ink-600 mt-1">
            Add a URL above, or open a completed scan and choose “Monitor this site”.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {monitors.map((m) => (
            <li
              key={m.id}
              className="rounded-lg ring-1 ring-line bg-paper p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-ink-400 shrink-0" aria-hidden />
                  <span className="font-medium text-ink-900 truncate">{m.name}</span>
                  <Badge tone={m.status === "active" ? "success" : "neutral"}>
                    {m.status === "active" ? "Active" : "Paused"}
                  </Badge>
                  <Badge tone="info">{FREQUENCY_LABEL[m.frequency]}</Badge>
                </div>
                <p className="text-xs text-ink-500 mt-1 truncate">
                  {m.targetUrl}
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  {m.status === "active"
                    ? `Next run ${formatWhen(m.nextRunAt)}`
                    : "Paused"}
                  {m.lastScanId && (
                    <>
                      {" · "}
                      <Link
                        href={`/app/scans/${m.lastScanId}`}
                        className="text-blue-600 hover:underline"
                      >
                        Latest scan
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleStatus(m)}
                  disabled={busyId === m.id}
                  aria-label={m.status === "active" ? "Pause monitor" : "Resume monitor"}
                >
                  {busyId === m.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : m.status === "active" ? (
                    <Pause className="size-4" aria-hidden />
                  ) : (
                    <Play className="size-4" aria-hidden />
                  )}
                  {m.status === "active" ? "Pause" : "Resume"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(m)}
                  disabled={busyId === m.id}
                  aria-label="Delete monitor"
                  className="text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
