/**
 * Monitor scheduling math (Layer 2 — continuous monitoring).
 *
 * Pure functions, no I/O, so they're trivially testable and shared between the
 * create/edit API (which sets the first `nextRunAt`) and the future scheduler
 * endpoint (which advances `nextRunAt` after each run). Keeping the cadence
 * here — not in Firestore code — means one source of truth for "when next".
 */
import type { MonitorFrequency } from "@/lib/data/types";

export const MONITOR_FREQUENCIES: readonly MonitorFrequency[] = [
  "daily",
  "every_3_days",
  "weekly",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const FREQUENCY_DAYS: Record<MonitorFrequency, number> = {
  daily: 1,
  every_3_days: 3,
  weekly: 7,
};

export function frequencyToMs(frequency: MonitorFrequency): number {
  return FREQUENCY_DAYS[frequency] * DAY_MS;
}

/**
 * The next run time for a monitor, measured forward from `from`.
 *
 * Advancing from "now" (rather than from the previous scheduled slot) means a
 * monitor that was paused, late, or just created never tries to "catch up" by
 * firing a burst of back-dated scans — each run simply schedules the next one
 * a full interval out. This is the cheap, conservative choice the plan calls
 * for (compute is the main monitoring risk).
 */
export function computeNextRunAt(
  frequency: MonitorFrequency,
  from: Date = new Date()
): Date {
  return new Date(from.getTime() + frequencyToMs(frequency));
}

export function isFrequency(value: unknown): value is MonitorFrequency {
  return (
    typeof value === "string" &&
    (MONITOR_FREQUENCIES as readonly string[]).includes(value)
  );
}
