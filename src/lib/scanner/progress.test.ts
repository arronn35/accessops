import { describe, expect, it } from "vitest";
import {
  HEARTBEAT_STALE_MS,
  isHeartbeatStale,
  toMillis,
  viewFromScanDoc,
} from "./progress";

describe("toMillis", () => {
  it("handles Firestore Timestamp objects", () => {
    expect(toMillis({ toMillis: () => 1234 })).toBe(1234);
    expect(toMillis({ seconds: 2, nanoseconds: 500_000_000 })).toBe(2500);
  });
  it("handles Date, ISO string and number", () => {
    const d = new Date("2026-06-13T00:00:00.000Z");
    expect(toMillis(d)).toBe(d.getTime());
    expect(toMillis("2026-06-13T00:00:00.000Z")).toBe(d.getTime());
    expect(toMillis(9999)).toBe(9999);
  });
  it("returns null for missing/invalid", () => {
    expect(toMillis(null)).toBeNull();
    expect(toMillis(undefined)).toBeNull();
    expect(toMillis("not-a-date")).toBeNull();
  });
});

describe("viewFromScanDoc", () => {
  it("maps granular progress fields", () => {
    const view = viewFromScanDoc("scan-1", {
      status: "running",
      progressStep: "scanning",
      currentStep: "scanning",
      currentUrl: "https://example.com/about",
      currentState: "desktop",
      pagesDone: 2,
      pagesTotal: 5,
      processorHeartbeatAt: { toMillis: () => 1000 },
    });
    expect(view).toMatchObject({
      id: "scan-1",
      status: "running",
      currentUrl: "https://example.com/about",
      currentState: "desktop",
      pagesDone: 2,
      pagesTotal: 5,
      processorHeartbeatAtMs: 1000,
    });
  });

  it("falls back to legacy fields when granular ones are absent", () => {
    const view = viewFromScanDoc("scan-2", {
      status: "running",
      progressStep: "scanning",
      pagesScanned: 1,
      pagesDiscovered: 3,
    });
    expect(view.pagesDone).toBe(1);
    expect(view.pagesTotal).toBe(3);
    expect(view.currentStep).toBe("scanning");
  });

  it("never lets pagesTotal fall below pagesDone", () => {
    const view = viewFromScanDoc("scan-3", {
      status: "running",
      pagesDone: 4,
      pagesTotal: 2,
    });
    expect(view.pagesTotal).toBe(4);
  });

  it("carries the user-facing failure message and code", () => {
    const view = viewFromScanDoc("scan-4", {
      status: "failed",
      errorCode: "worker_heartbeat_stale",
      errorMessage: "The scan worker stopped responding. Please retry.",
    });
    expect(view.status).toBe("failed");
    expect(view.errorCode).toBe("worker_heartbeat_stale");
    expect(view.errorMessage).toContain("stopped responding");
  });
});

describe("isHeartbeatStale", () => {
  const base = { status: "running" as const, processorHeartbeatAtMs: 100_000 };

  it("is false for a fresh heartbeat", () => {
    expect(isHeartbeatStale(base, 100_000 + 10_000)).toBe(false);
  });
  it("is true once the heartbeat exceeds the threshold", () => {
    expect(isHeartbeatStale(base, 100_000 + HEARTBEAT_STALE_MS + 1)).toBe(true);
  });
  it("is false for non-running statuses", () => {
    expect(
      isHeartbeatStale({ status: "completed", processorHeartbeatAtMs: 0 }, 1e12)
    ).toBe(false);
    expect(
      isHeartbeatStale({ status: "queued", processorHeartbeatAtMs: null }, 1e12)
    ).toBe(false);
  });
  it("does not alarm when the heartbeat is unknown", () => {
    expect(
      isHeartbeatStale({ status: "running", processorHeartbeatAtMs: null }, 1e12)
    ).toBe(false);
  });
});
