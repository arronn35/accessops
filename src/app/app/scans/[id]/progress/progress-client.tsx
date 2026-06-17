"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Check, ScanLine, Layers, Sparkles, FileBarChart2, Eye, X, Globe, Camera, AlertCircle, RadioTower,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NoGuaranteeBanner } from "@/components/compliance/NoGuaranteeBanner";
import { AlertCallout } from "@/components/feedback/AlertCallout";
import {
  firebaseClientAuth,
  firebaseClientConfigured,
  firebaseClientFirestore,
} from "@/lib/firebase/client";
import {
  isHeartbeatStale,
  toMillis,
  viewFromScanDoc,
  type ScanProgressView,
} from "@/lib/scanner/progress";
import type { ScanJob } from "@/lib/data/types";

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
  aggregating: 3,
  saving: 4,
  completed: 5,
  failed: -1,
};

function viewFromInitial(initial: ScanJob): ScanProgressView {
  return {
    id: initial.id,
    status: initial.status,
    phase: initial.phase ?? null,
    progressStep: initial.progressStep,
    currentStep: initial.currentStep ?? initial.progressStep,
    currentUrl: initial.currentUrl ?? null,
    currentState: initial.currentState ?? null,
    pagesDone: initial.pagesDone ?? initial.pagesScanned,
    pagesTotal: Math.max(
      initial.pagesDone ?? initial.pagesScanned,
      initial.pagesTotal ?? initial.pagesDiscovered ?? initial.maxPages
    ),
    pagesFailed: initial.pagesFailed ?? 0,
    errorMessage: initial.errorMessage,
    errorCode: initial.errorCode ?? null,
    processorHeartbeatAtMs: toMillis(initial.processorHeartbeatAt ?? null),
  };
}

/** Map the HTTP status-route JSON (fallback path) into the view model. */
function viewFromStatusApi(data: Record<string, unknown>): Partial<ScanProgressView> {
  const pagesDone = num(data.pagesDone, num(data.pagesScanned));
  return {
    status: (data.status as ScanProgressView["status"]) ?? "queued",
    phase: asStr(data.phase) as ScanProgressView["phase"],
    progressStep: asStr(data.progressStep),
    currentStep: asStr(data.currentStep) ?? asStr(data.progressStep),
    currentUrl: asStr(data.currentUrl),
    currentState: asStr(data.currentState),
    pagesDone,
    pagesTotal: Math.max(pagesDone, num(data.pagesTotal, num(data.pagesDiscovered))),
    pagesFailed: num(data.pagesFailed),
    errorMessage: asStr(data.errorMessage),
    errorCode: asStr(data.errorCode),
    processorHeartbeatAtMs: toMillis(data.processorHeartbeatAt as never),
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function asStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function ProgressClient({ initial }: { initial: ScanJob }) {
  const router = useRouter();
  const [state, setState] = useState<ScanProgressView>(() => viewFromInitial(initial));
  const [pollToken, setPollToken] = useState(0);
  // Local clock tick so the stale-heartbeat banner appears 45s after the last
  // heartbeat even when no new snapshot/poll arrives (i.e. the worker died).
  const [nowMs, setNowMs] = useState(() => Date.now());
  const transportRef = useRef<"realtime" | "polling" | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubSnap: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    function goToResults() {
      router.replace(`/app/scans/${initial.id}`);
    }

    // --- HTTP status polling: fallback for clients without a live Firebase
    // auth session, or if the realtime listener errors (e.g. rules deny). ---
    function startPolling() {
      if (cancelled || transportRef.current === "polling") return;
      transportRef.current = "polling";
      let intervalMs = 1500;
      async function tick() {
        if (cancelled) return;
        let keepGoing = true;
        try {
          const res = await fetch(`/api/scans/${initial.id}/status`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (cancelled) return;
            setState((s) => ({ ...s, ...viewFromStatusApi(data) }));
            if (data.status === "completed") { keepGoing = false; goToResults(); return; }
            if (data.status === "failed") { keepGoing = false; return; }
            intervalMs = data.status === "running" ? 2500 : 1500;
          }
        } catch {
          // transient — retry next tick
        } finally {
          if (!cancelled && keepGoing) pollTimer = setTimeout(tick, intervalMs);
        }
      }
      pollTimer = setTimeout(tick, intervalMs);
    }

    // --- Realtime: subscribe directly to the scan document. ---
    function startRealtime() {
      if (cancelled) return;
      try {
        const db = firebaseClientFirestore();
        const ref = doc(db, "workspaces", initial.workspaceId, "scans", initial.id);
        transportRef.current = "realtime";
        unsubSnap = onSnapshot(
          ref,
          (snap) => {
            if (cancelled || !snap.exists()) return;
            const view = viewFromScanDoc(snap.id, snap.data() as Record<string, unknown>);
            setState((s) => ({ ...s, ...view }));
            if (view.status === "completed") goToResults();
          },
          () => {
            // Permission denied / transient listener error → degrade to polling.
            if (unsubSnap) { unsubSnap(); unsubSnap = null; }
            transportRef.current = null;
            startPolling();
          }
        );
      } catch {
        startPolling();
      }
    }

    if (!firebaseClientConfigured()) {
      startPolling();
    } else {
      const auth = firebaseClientAuth();
      if (auth.currentUser) {
        startRealtime();
      } else {
        // currentUser may rehydrate from persistence asynchronously; wait one
        // auth resolution, then choose realtime (signed in) or polling.
        unsubAuth = onAuthStateChanged(auth, (user) => {
          if (unsubAuth) { unsubAuth(); unsubAuth = null; }
          if (cancelled) return;
          if (user) startRealtime();
          else startPolling();
        });
      }
    }

    return () => {
      cancelled = true;
      if (unsubSnap) unsubSnap();
      if (unsubAuth) unsubAuth();
      if (pollTimer) clearTimeout(pollTimer);
      transportRef.current = null;
    };
  }, [initial.id, initial.workspaceId, router, pollToken]);

  const heartbeatStale = isHeartbeatStale(state, nowMs);
  const currentStepIdx =
    state.status === "queued"
      ? 0
      : state.status === "failed"
      ? -1
      : STEP_ORDER[state.currentStep ?? state.progressStep ?? "queued"] ?? 1;

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
            onRetry={(next) => {
              setState((s) => ({ ...s, ...next }));
              setPollToken((value) => value + 1);
            }}
          />
        </AlertCallout>
      )}

      {state.status !== "failed" && state.errorMessage && (
        <AlertCallout
          tone="warning"
          icon={AlertCircle}
          title={state.progressStep === "queue_retry_pending" ? "Scan queued" : "Scan option adjusted"}
          className="mb-5"
        >
          {humanizeError(state.errorMessage)}
        </AlertCallout>
      )}

      {state.status === "queued" && (
        <AlertCallout tone="info" icon={ScanLine} title="Scan queued" className="mb-5">
          The scan job is safely queued. The browser scanner worker will pick it up
          automatically and this page will switch to running when processing starts.
        </AlertCallout>
      )}

      {state.status === "running" && heartbeatStale && (
        <AlertCallout tone="warning" icon={RadioTower} title="Worker heartbeat stale — recovering automatically" className="mb-5">
          <p className="mb-2">
            The scanner stopped reporting progress. The system is reclaiming this
            scan automatically — it will resume shortly, or fail with a clear
            message if it can&apos;t be recovered. You can also retry now.
          </p>
          <RetryControls
            scanJobId={initial.id}
            onRetry={(next) => {
              setState((s) => ({ ...s, ...next }));
              setPollToken((value) => value + 1);
            }}
          />
        </AlertCallout>
      )}

      <Card>
        <CardContent className="pt-5">
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const failedStep = state.status === "failed" && i === 0;
              const done = state.status !== "failed" && i < currentStepIdx;
              const active = i === currentStepIdx && state.status !== "failed";
              const Icon = s.icon;
              return (
                <li key={s.id} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`size-9 rounded-md inline-flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-green-50 text-green-700 ring-1 ring-green-50"
                        : failedStep
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                        : active
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                        : "bg-canvas-2 text-ink-400 ring-1 ring-line"
                    }`}
                  >
                    {done ? (
                      <Check className="size-4" />
                    ) : failedStep ? (
                      <AlertCircle className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
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
                    {failedStep && <span className="text-rose-700">Failed</span>}
                    {active && <span className="text-blue-700">In progress</span>}
                    {!done && !active && !failedStep && (
                      <span className="text-ink-400">
                        {state.status === "failed" ? "Not completed" : "Queued"}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>

          {state.status === "running" && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-ink-600">
                {state.pagesDone} scanned
                {state.pagesFailed > 0 ? `, ${state.pagesFailed} failed` : ""} /{" "}
                {state.pagesTotal || initial.maxPages} pages processed
                {state.currentState ? ` · ${state.currentState} viewport` : ""}.
              </p>
              {state.currentUrl && (
                <p className="text-xs text-ink-500 font-mono truncate" title={state.currentUrl}>
                  <ScanLine className="size-3 inline mr-1 -mt-0.5" aria-hidden />
                  {state.currentUrl}
                </p>
              )}
            </div>
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
              <DataItem
                on={initial.includeScreenshots}
                off={!initial.includeScreenshots}
                label="Screenshots"
                hint={initial.includeScreenshots ? "Enabled this scan" : "Off"}
              />
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
        You can leave this page. Queued and completed results persist in your workspace.
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
  onRetry: (next: Partial<ScanProgressView>) => void;
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
      // Reset local UI to "queued"; the realtime listener (or poll) picks up
      // the new run from here.
      onRetry({
        status: "queued",
        phase: null,
        progressStep: "queued",
        currentStep: "queued",
        currentUrl: null,
        currentState: null,
        pagesDone: 0,
        pagesTotal: 0,
        pagesFailed: 0,
        errorMessage: null,
        errorCode: null,
        processorHeartbeatAtMs: null,
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
