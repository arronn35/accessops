import { describe, expect, it } from "vitest";
import {
  isScanOwnedByWorker,
  isScanWorkerHeartbeatStale,
} from "./scan-lifecycle";
import type { ScanJob } from "./types";

function scan(overrides: Partial<ScanJob> = {}): ScanJob {
  const now = new Date("2026-06-09T12:00:00.000Z");
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    projectId: null,
    requestedBy: "user-1",
    scanType: "single",
    status: "running",
    baseUrl: "https://example.com",
    sourceUrlsJson: null,
    maxPages: 1,
    pagesDiscovered: 0,
    pagesScanned: 0,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "scanning",
    startedAt: now,
    completedAt: null,
    errorMessage: null,
    processorStartedAt: now,
    processorHeartbeatAt: now,
    processorError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("scan worker lifecycle helpers", () => {
  it("recognizes only a running scan claimed by the same worker as owned", () => {
    expect(isScanOwnedByWorker(scan({ claimedBy: "worker-1" }), "worker-1")).toBe(
      true
    );
    expect(isScanOwnedByWorker(scan({ claimedBy: "worker-2" }), "worker-1")).toBe(
      false
    );
    for (const status of ["queued", "completed", "failed", "cancelled"] as const) {
      expect(
        isScanOwnedByWorker(
          scan({ status, claimedBy: "worker-1" }),
          "worker-1"
        )
      ).toBe(false);
    }
  });

  it("does not mark queued or fresh running scans as stale", () => {
    const at = new Date("2026-06-09T12:01:00.000Z").getTime();

    expect(isScanWorkerHeartbeatStale(scan({ status: "queued" }), at)).toBe(false);
    expect(isScanWorkerHeartbeatStale(scan(), at)).toBe(false);
  });

  it("marks old running heartbeats as stale", () => {
    const at = new Date("2026-06-09T12:10:00.000Z").getTime();

    expect(
      isScanWorkerHeartbeatStale(
        scan({ processorHeartbeatAt: new Date("2026-06-09T12:00:00.000Z") }),
        at
      )
    ).toBe(true);
  });

  it("falls back to processor start, scan start, and update times when heartbeat is missing", () => {
    const at = new Date("2026-06-09T12:10:00.000Z").getTime();

    expect(
      isScanWorkerHeartbeatStale(
        scan({
          processorHeartbeatAt: null,
          processorStartedAt: new Date("2026-06-09T12:00:00.000Z"),
        }),
        at
      )
    ).toBe(true);
    expect(
      isScanWorkerHeartbeatStale(
        scan({
          processorHeartbeatAt: null,
          processorStartedAt: null,
          startedAt: new Date("2026-06-09T12:00:00.000Z"),
        }),
        at
      )
    ).toBe(true);
    expect(
      isScanWorkerHeartbeatStale(
        scan({
          processorHeartbeatAt: null,
          processorStartedAt: null,
          startedAt: null,
          updatedAt: new Date("2026-06-09T12:00:00.000Z"),
        }),
        at
      )
    ).toBe(true);
  });
});
