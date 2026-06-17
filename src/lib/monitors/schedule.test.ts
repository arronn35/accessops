import { describe, it, expect } from "vitest";
import {
  computeNextRunAt,
  frequencyToMs,
  isFrequency,
  MONITOR_FREQUENCIES,
} from "./schedule";

const DAY = 24 * 60 * 60 * 1000;

describe("monitor scheduling", () => {
  it("maps each frequency to the right interval", () => {
    expect(frequencyToMs("daily")).toBe(DAY);
    expect(frequencyToMs("every_3_days")).toBe(3 * DAY);
    expect(frequencyToMs("weekly")).toBe(7 * DAY);
  });

  it("advances nextRunAt one full interval from the given time", () => {
    const from = new Date("2026-06-17T00:00:00.000Z");
    expect(computeNextRunAt("daily", from).toISOString()).toBe(
      "2026-06-18T00:00:00.000Z"
    );
    expect(computeNextRunAt("weekly", from).toISOString()).toBe(
      "2026-06-24T00:00:00.000Z"
    );
  });

  it("schedules forward from now, never back-dated (no catch-up bursts)", () => {
    const before = Date.now();
    const next = computeNextRunAt("daily").getTime();
    expect(next).toBeGreaterThanOrEqual(before + DAY - 1000);
  });

  it("recognizes valid frequencies and rejects junk", () => {
    for (const f of MONITOR_FREQUENCIES) expect(isFrequency(f)).toBe(true);
    expect(isFrequency("hourly")).toBe(false);
    expect(isFrequency(null)).toBe(false);
    expect(isFrequency(7)).toBe(false);
  });
});
