import { describe, expect, it } from "vitest";
import {
  sweepScans,
  SWEEP_ERROR_MESSAGES,
  type SweepableScan,
  type SweepThresholds,
} from "./scan-sweeper";
import type { ScanStatus } from "./types";

const NOW = Date.UTC(2026, 5, 13, 12, 0, 0);

const thresholds: SweepThresholds = {
  staleRunningMs: 45_000,
  queueTimeoutMs: 30 * 60_000,
  reclaimLimit: 3,
  overallCapMs: 15 * 60_000,
};

function doc(overrides: Partial<SweepableScan> & { status: ScanStatus }): SweepableScan {
  const created = new Date(NOW - 60_000);
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    createdAt: created,
    updatedAt: created,
    startedAt: null,
    processorStartedAt: null,
    processorHeartbeatAt: null,
    reclaimAttempts: 0,
    ...overrides,
  };
}

function secondsAgo(s: number): Date {
  return new Date(NOW - s * 1000);
}

describe("sweepScans", () => {
  it("leaves a fresh running job untouched", () => {
    const actions = sweepScans(
      NOW,
      [doc({ status: "running", processorHeartbeatAt: secondsAgo(10) })],
      thresholds
    );
    expect(actions).toEqual([]);
  });

  it("does not reclaim an active page-job scan from its scan-level heartbeat", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({
          status: "running",
          usePageJobs: true,
          phase: "scanning",
          startedAt: secondsAgo(5 * 60),
          processorHeartbeatAt: secondsAgo(5 * 60),
        }),
      ],
      thresholds
    );
    expect(actions).toEqual([]);
  });

  it("fails a page-job scan that exceeds the overall cap", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({
          status: "running",
          usePageJobs: true,
          phase: "scanning",
          startedAt: secondsAgo(16 * 60),
        }),
      ],
      thresholds
    );
    expect(actions).toMatchObject([
      { type: "fail", errorCode: "scan_deadline_exceeded" },
    ]);
  });

  it("requeues a running job whose heartbeat is stale", () => {
    const actions = sweepScans(
      NOW,
      [doc({ status: "running", processorHeartbeatAt: secondsAgo(46) })],
      thresholds
    );
    expect(actions).toEqual([
      {
        type: "requeue",
        workspaceId: "ws-1",
        scanId: "scan-1",
        previousAttempts: 0,
      },
    ]);
  });

  it("does not requeue a running job exactly at the stale boundary", () => {
    const actions = sweepScans(
      NOW,
      [doc({ status: "running", processorHeartbeatAt: secondsAgo(45) })],
      thresholds
    );
    expect(actions).toEqual([]);
  });

  it("treats a running job with no timestamps at all as stale", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({
          status: "running",
          createdAt: null as unknown as Date,
          updatedAt: null as unknown as Date,
        }),
      ],
      thresholds
    );
    expect(actions).toMatchObject([{ type: "requeue" }]);
  });

  it("falls back to older timestamps for legacy docs without heartbeat fields", () => {
    // Pre-deploy in-flight scan: no processor* fields, but startedAt exists.
    const stale = sweepScans(
      NOW,
      [doc({ status: "running", startedAt: secondsAgo(120) })],
      thresholds
    );
    expect(stale).toMatchObject([{ type: "requeue" }]);

    const fresh = sweepScans(
      NOW,
      [doc({ status: "running", startedAt: secondsAgo(10) })],
      thresholds
    );
    expect(fresh).toEqual([]);
  });

  it("fails the third stale running attempt with the worker heartbeat code", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({
          status: "running",
          processorHeartbeatAt: secondsAgo(60),
          reclaimAttempts: 2,
        }),
      ],
      thresholds
    );
    expect(actions).toEqual([
      {
        type: "fail",
        workspaceId: "ws-1",
        scanId: "scan-1",
        errorCode: "worker_heartbeat_stale",
        errorMessage: SWEEP_ERROR_MESSAGES.worker_heartbeat_stale,
        reclaimAttempts: 3,
      },
    ]);
  });

  it("fails a running job whose reclaim attempts are already exhausted", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({
          status: "running",
          processorHeartbeatAt: secondsAgo(5),
          reclaimAttempts: 3,
        }),
      ],
      thresholds
    );
    expect(actions).toMatchObject([
      { type: "fail", errorCode: "worker_heartbeat_stale" },
    ]);
  });

  it("fails a queued job whose reclaim attempts are exhausted", () => {
    const actions = sweepScans(
      NOW,
      [doc({ status: "queued", reclaimAttempts: 3 })],
      thresholds
    );
    expect(actions).toMatchObject([
      { type: "fail", errorCode: "worker_heartbeat_stale" },
    ]);
  });

  it("fails an ancient queued job with queue_timeout", () => {
    const old = secondsAgo(31 * 60);
    const actions = sweepScans(
      NOW,
      [doc({ status: "queued", createdAt: old, updatedAt: old })],
      thresholds
    );
    expect(actions).toEqual([
      {
        type: "fail",
        workspaceId: "ws-1",
        scanId: "scan-1",
        errorCode: "queue_timeout",
        errorMessage: SWEEP_ERROR_MESSAGES.queue_timeout,
        reclaimAttempts: 0,
      },
    ]);
  });

  it("measures queue timeout from createdAt even when updatedAt is recent", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({
          status: "queued",
          createdAt: secondsAgo(4 * 60 * 60),
          updatedAt: secondsAgo(60),
        }),
      ],
      thresholds
    );
    expect(actions).toMatchObject([{ type: "fail", errorCode: "queue_timeout" }]);
  });

  it("leaves fresh queued jobs alone", () => {
    const actions = sweepScans(NOW, [doc({ status: "queued" })], thresholds);
    expect(actions).toEqual([]);
  });

  it("never touches terminal jobs, however stale their fields look", () => {
    const ancient = secondsAgo(60 * 60);
    const docs: SweepableScan[] = (["completed", "failed", "cancelled"] as ScanStatus[]).map(
      (status, i) =>
        doc({
          id: `scan-${i}`,
          status,
          createdAt: ancient,
          updatedAt: ancient,
          processorHeartbeatAt: ancient,
          reclaimAttempts: 5,
        })
    );
    expect(sweepScans(NOW, docs, thresholds)).toEqual([]);
  });

  it("is idempotent: applying an action leaves a state that yields no further action", () => {
    // Requeue case: stale running -> queued with attempts+1 and fresh updatedAt.
    const stale = doc({
      status: "running",
      processorHeartbeatAt: secondsAgo(60),
      reclaimAttempts: 0,
    });
    const [action] = sweepScans(NOW, [stale], thresholds);
    expect(action).toMatchObject({ type: "requeue", previousAttempts: 0 });

    const afterRequeue = doc({
      status: "queued",
      reclaimAttempts: 1,
      updatedAt: new Date(NOW),
    });
    expect(sweepScans(NOW, [afterRequeue], thresholds)).toEqual([]);

    // Fail case: failed doc is terminal, so a second sweep proposes nothing.
    const afterFail = doc({ status: "failed", reclaimAttempts: 3 });
    expect(sweepScans(NOW, [afterFail], thresholds)).toEqual([]);
  });

  it("tolerates concurrent sweepers: identical snapshots produce identical actions", () => {
    const docs = [
      doc({ id: "a", status: "running", processorHeartbeatAt: secondsAgo(60) }),
      doc({ id: "b", status: "queued", createdAt: secondsAgo(40 * 60), updatedAt: secondsAgo(40 * 60) }),
      doc({ id: "c", status: "completed" }),
    ];
    const first = sweepScans(NOW, docs, thresholds);
    const second = sweepScans(NOW, docs, thresholds);
    expect(second).toEqual(first);
    expect(first).toHaveLength(2);
  });

  it("sweeps multiple docs independently in one pass", () => {
    const actions = sweepScans(
      NOW,
      [
        doc({ id: "fresh-running", status: "running", processorHeartbeatAt: secondsAgo(1) }),
        doc({ id: "stale-running", status: "running", processorHeartbeatAt: secondsAgo(90) }),
        doc({
          id: "exhausted",
          status: "running",
          processorHeartbeatAt: secondsAgo(90),
          reclaimAttempts: 3,
        }),
        doc({ id: "old-queued", status: "queued", createdAt: secondsAgo(45 * 60), updatedAt: secondsAgo(45 * 60) }),
        doc({ id: "done", status: "completed" }),
      ],
      thresholds
    );
    expect(actions).toEqual([
      expect.objectContaining({ type: "requeue", scanId: "stale-running" }),
      expect.objectContaining({
        type: "fail",
        scanId: "exhausted",
        errorCode: "worker_heartbeat_stale",
      }),
      expect.objectContaining({
        type: "fail",
        scanId: "old-queued",
        errorCode: "queue_timeout",
      }),
    ]);
  });
});
