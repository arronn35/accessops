"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check, ScanLine, Layers, Sparkles, FileBarChart2, Eye, X, Globe, Camera, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import type { ScanJob } from "@/lib/db/schema";

const STEPS = [
  { id: "queued", label: "Queued", icon: ScanLine, body: "Preparing the scan job." },
  { id: "starting_browser", label: "Preparing scanner", icon: ScanLine, body: "Validating the target and scan settings." },
  { id: "scanning", label: "Scanning pages", icon: Layers, body: "Checking each page for automated accessibility findings." },
  { id: "processing", label: "Processing results", icon: Eye, body: "Normalizing findings and grouping issues." },
  { id: "saving", label: "Saving results", icon: Sparkles, body: "Persisting pages and issues to the database." },
  { id: "completed", label: "Completed", icon: FileBarChart2, body: "Ready for review." },
] as const;

const STEP_ORDER: Record<string, number> = {
  queued: 0,
  starting_browser: 1,
  crawling: 2,
  scanning: 2,
  processing: 3,
  saving: 4,
  completed: 5,
  failed: -1,
};

interface PollResponse {
  id: string;
  status: ScanJob["status"];
  progressStep: string | null;
  pagesScanned: number;
  pagesDiscovered: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export function ProgressClient({ initial }: { initial: ScanJob }) {
  const router = useRouter();
  const [state, setState] = useState<PollResponse>({
    id: initial.id,
    status: initial.status,
    progressStep: initial.progressStep,
    pagesScanned: initial.pagesScanned,
    pagesDiscovered: initial.pagesDiscovered,
    startedAt: initial.startedAt?.toISOString() ?? null,
    completedAt: initial.completedAt?.toISOString() ?? null,
    errorMessage: initial.errorMessage,
  });

  useEffect(() => {
    let cancelled = false;
    let intervalMs = 1500;

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/scans/${initial.id}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: PollResponse = await res.json();
        if (cancelled) return;
        setState(data);
        if (data.status === "completed") {
          router.replace(`/app/scans/${initial.id}`);
          return;
        }
        if (data.status === "failed") return;
        // Back off polling once the scan is actively running.
        intervalMs = data.status === "running" ? 2500 : 1500;
      } catch {
        // ignore transient network errors; next tick will retry
      } finally {
        if (!cancelled) setTimeout(tick, intervalMs);
      }
    }

    const t = setTimeout(tick, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [initial.id, router]);

  const currentStepIdx =
    state.status === "queued"
      ? 0
      : state.status === "failed"
      ? -1
      : STEP_ORDER[state.progressStep ?? "queued"] ?? 1;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-3xl">
      <header className="mb-6">
        <Badge
          tone={
            state.status === "failed"
              ? "danger"
              : state.status === "completed"
              ? "success"
              : "info"
          }
          size="sm"
          className="mb-2 inline-flex"
        >
          <span
            className={
              state.status === "failed"
                ? "size-1.5 rounded-full bg-rose-500"
                : state.status === "completed"
                ? "size-1.5 rounded-full bg-green-500"
                : "size-1.5 rounded-full bg-blue-500 pulse-dot"
            }
            aria-hidden
          />
          {state.status === "queued" && "Queued"}
          {state.status === "running" && "Scan running"}
          {state.status === "completed" && "Complete"}
          {state.status === "failed" && "Failed"}
        </Badge>
        <h1 className="text-2xl lg:text-3xl font-semibold text-ink-900 tracking-tight">
          Scanning {hostFromUrl(initial.baseUrl)}
        </h1>
        <p className="text-sm text-ink-600 mt-1 flex items-center gap-2 font-mono">
          <Globe className="size-3.5" aria-hidden /> {initial.id}
        </p>
      </header>

      {state.status === "failed" && (
        <AlertCallout tone="danger" icon={AlertCircle} title="Scan failed" className="mb-5">
          <p className="mb-2">{humanizeError(state.errorMessage)}</p>
          <RetryControls
            scanJobId={initial.id}
            onRetry={(next) => setState((s) => ({ ...s, ...next }))}
          />
        </AlertCallout>
      )}

      <Card>
        <CardContent className="pt-5">
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const done = i < currentStepIdx;
              const active = i === currentStepIdx && state.status !== "failed";
              const Icon = s.icon;
              return (
                <li key={s.id} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`size-9 rounded-md inline-flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-green-50 text-green-700 ring-1 ring-green-50"
                        : active
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                        : "bg-canvas-2 text-ink-400 ring-1 ring-line"
                    }`}
                  >
                    {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <div className="flex-1 min-w-0 pt-1">
                    <p
                      className={`text-sm font-medium ${
                        !done && !active ? "text-ink-500" : "text-ink-900"
                      }`}
                    >
                      {s.label}
                      {active && (
                        <span
                          className="ml-2 inline-block size-1.5 rounded-full bg-blue-500 pulse-dot"
                          aria-hidden
                        />
                      )}
                    </p>
                    <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">{s.body}</p>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold shrink-0 mt-2">
                    {done && <span className="text-green-700">Done</span>}
                    {active && <span className="text-blue-700">In progress</span>}
                    {!done && !active && <span className="text-ink-400">Queued</span>}
                  </span>
                </li>
              );
            })}
          </ol>

          {state.status === "running" && (
            <p className="text-xs text-ink-600 mt-4">
              {state.pagesScanned} / {state.pagesDiscovered || initial.maxPages} pages scanned.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What we&apos;re capturing</CardTitle>
            <CardDescription>Live data scope</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs text-ink-700">
              <DataItem on label="Page HTML structure (no form values)" />
              <DataItem on label="Computed accessibility tree" />
              <DataItem on label="Color contrast samples" />
              <DataItem off label="Screenshots" hint={initial.includeScreenshots ? "Enabled this scan" : "Off"} />
              <DataItem
                off
                label="Cookies & local storage"
                hint="Never captured"
                icon={<X className="size-3" aria-hidden />}
              />
            </ul>
          </CardContent>
        </Card>

        <NoGuaranteeBanner variant="default" />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 h-10 px-3 rounded-md ring-1 ring-line bg-paper text-sm text-ink-700 hover:bg-canvas-2"
        >
          Back to dashboard
        </Link>
        {state.status === "completed" && (
          <Link
            href={`/app/scans/${initial.id}`}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-md bg-navy-900 text-paper text-sm font-medium hover:bg-navy-800"
          >
            View results
          </Link>
        )}
      </div>

      <p className="text-xs text-ink-500 mt-6 leading-relaxed">
        You can leave this page — results persist in your workspace.
      </p>
    </div>
  );
}

function DataItem({
  on,
  label,
  hint,
  icon,
}: {
  on?: boolean;
  off?: boolean;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`size-4 rounded inline-flex items-center justify-center ring-1 ${
          on ? "bg-green-50 text-green-700 ring-green-50" : "bg-canvas-2 text-ink-500 ring-line"
        }`}
        aria-hidden
      >
        {icon ?? (on ? <Check className="size-3" aria-hidden /> : <Camera className="size-3" aria-hidden />)}
      </span>
      <span className="text-ink-700">{label}</span>
      {hint && <span className="text-ink-500">· {hint}</span>}
    </li>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function RetryControls({
  scanJobId,
  onRetry,
}: {
  scanJobId: string;
  onRetry: (next: Partial<PollResponse>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/scans/${scanJobId}/retry`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || data.error || "Could not retry scan.");
        setBusy(false);
        return;
      }
      // Reset local UI to "queued" so the polling loop picks up the new run.
      onRetry({
        status: "queued",
        progressStep: "queued",
        pagesScanned: 0,
        pagesDiscovered: 0,
        startedAt: null,
        completedAt: null,
        errorMessage: null,
      });
      setBusy(false);
    } catch (e) {
      setErr((e as Error).message ?? "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={retry}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-rose-500 text-paper text-xs font-medium hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? "Retrying…" : "Retry scan"}
        </button>
        <Link
          href="/app/scans/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md ring-1 ring-line bg-paper text-xs font-medium text-ink-700 hover:bg-canvas-2"
        >
          Start a new scan
        </Link>
      </div>
      {err && <p className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}

function humanizeError(msg: string | null): string {
  if (!msg) return "An unknown error occurred.";
  if (msg === "scan_timeout") return "The scan exceeded its time budget.";
  if (msg.startsWith("Redirect rejected")) return "The site redirected to a blocked address.";
  if (msg.startsWith("permission_not_confirmed")) return "Permission confirmation was missing.";
  if (msg.includes("Navigation failed")) return "The site refused our connection or returned an error.";
  return msg;
}
