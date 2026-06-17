/**
 * Client-safe helpers for the realtime scan progress page.
 *
 * Pure functions only (no Firebase imports) so the staleness logic and the
 * snapshot→view mapping are unit-testable and can be shared by the onSnapshot
 * path and the HTTP-status fallback path without drift.
 */
import type { ScanPhase, ScanStatus } from "@/lib/data/types";

/**
 * Heartbeat age after which the UI shows the "recovering automatically"
 * banner. Matches the sweeper's stale-running window (SWEEP_STALE_RUNNING_MS
 * default) so the banner appears right as the watchdog would step in.
 */
export const HEARTBEAT_STALE_MS = 45_000;

export interface ScanProgressView {
  id: string;
  status: ScanStatus;
  phase: ScanPhase | null;
  progressStep: string | null;
  currentStep: string | null;
  currentUrl: string | null;
  currentState: string | null;
  pagesDone: number;
  pagesTotal: number;
  pagesFailed: number;
  errorMessage: string | null;
  errorCode: string | null;
  processorHeartbeatAtMs: number | null;
}

type TimestampLike =
  | { toMillis: () => number }
  | { seconds: number; nanoseconds?: number }
  | Date
  | string
  | number
  | null
  | undefined;

/** Coerce the various timestamp shapes (Firestore Timestamp, Date, ISO, ms) to ms. */
export function toMillis(value: TimestampLike): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof (value as { seconds?: unknown }).seconds === "number") {
    const v = value as { seconds: number; nanoseconds?: number };
    return v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1e6);
  }
  return null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Map a raw Firestore scan document (onSnapshot data) into the view model. */
export function viewFromScanDoc(
  id: string,
  data: Record<string, unknown>
): ScanProgressView {
  const status = (data.status as ScanStatus) ?? "queued";
  const pagesDone = num(data.pagesDone, num(data.pagesScanned));
  const pagesTotal = Math.max(
    pagesDone,
    num(data.pagesTotal, num(data.pagesDiscovered) || num(data.maxPages, 1))
  );
  return {
    id,
    status,
    phase: str(data.phase) as ScanPhase | null,
    progressStep: str(data.progressStep),
    currentStep: str(data.currentStep) ?? str(data.progressStep),
    currentUrl: str(data.currentUrl),
    currentState: str(data.currentState),
    pagesDone,
    pagesTotal,
    pagesFailed: num(data.pagesFailed),
    errorMessage: str(data.errorMessage),
    errorCode: str(data.errorCode),
    processorHeartbeatAtMs: toMillis(data.processorHeartbeatAt as TimestampLike),
  };
}

/** Is the worker heartbeat stale enough to show the recovery banner? */
export function isHeartbeatStale(
  view: Pick<ScanProgressView, "status" | "processorHeartbeatAtMs">,
  nowMs: number,
  thresholdMs = HEARTBEAT_STALE_MS
): boolean {
  if (view.status !== "running") return false;
  if (view.processorHeartbeatAtMs == null) return false; // unknown → don't alarm
  return nowMs - view.processorHeartbeatAtMs > thresholdMs;
}
