import { describe, expect, it } from "vitest";
import {
  pageJobAttemptsExhausted,
  pageJobParentClaimDecision,
  planPageFinalize,
  sweepPageJobs,
  terminalScanPhase,
  type PageJobSweepThresholds,
  type SweepablePageJob,
} from "./page-jobs";

const NOW = Date.UTC(2026, 5, 13, 12, 0, 0);
const thresholds: PageJobSweepThresholds = {
  staleMs: 60_000,
  maxAttempts: 2,
};

function job(overrides: Partial<SweepablePageJob> = {}): SweepablePageJob {
  return {
    id: "page-1",
    scanJobId: "scan-1",
    workspaceId: "ws-1",
    status: "running",
    attempts: 1,
    maxAttempts: 2,
    heartbeatAt: new Date(NOW - 61_000),
    startedAt: new Date(NOW - 61_000),
    createdAt: new Date(NOW - 120_000),
    ...overrides,
  };
}

describe("planPageFinalize", () => {
  it("gives exactly one serialized completion the aggregation trigger", () => {
    const first = planPageFinalize(
      { pagesTotal: 2, pagesDone: 0, pagesFailed: 0, phase: "scanning" },
      "done"
    );
    const second = planPageFinalize(
      {
        pagesTotal: 2,
        pagesDone: first.pagesDone,
        pagesFailed: first.pagesFailed,
        phase: first.nextPhase,
      },
      "failed"
    );

    expect([first.aggregationWon, second.aggregationWon]).toEqual([false, true]);
    expect(second.nextPhase).toBe("aggregating");

    const duplicate = planPageFinalize(
      {
        pagesTotal: 2,
        pagesDone: second.pagesDone,
        pagesFailed: second.pagesFailed,
        phase: second.nextPhase,
      },
      "done"
    );
    expect(duplicate.aggregationWon).toBe(false);
  });
});

describe("pageJobParentClaimDecision", () => {
  it("discards jobs whose parent scan is missing or terminal", () => {
    expect(pageJobParentClaimDecision(null)).toBe("discard");
    for (const status of ["completed", "failed", "cancelled"] as const) {
      expect(
        pageJobParentClaimDecision({
          status,
          usePageJobs: true,
          phase: "failed",
        })
      ).toBe("discard");
    }
  });

  it("claims only from an active per-page scan in the scanning phase", () => {
    expect(
      pageJobParentClaimDecision({
        status: "running",
        usePageJobs: true,
        phase: "scanning",
      })
    ).toBe("claim");
  });

  it("waits while a non-terminal parent is not ready to run page jobs", () => {
    expect(
      pageJobParentClaimDecision({
        status: "queued",
        usePageJobs: true,
        phase: null,
      })
    ).toBe("wait");
    expect(
      pageJobParentClaimDecision({
        status: "running",
        usePageJobs: true,
        phase: "crawling",
      })
    ).toBe("wait");
    expect(
      pageJobParentClaimDecision({
        status: "running",
        usePageJobs: false,
        phase: "scanning",
      })
    ).toBe("wait");
  });
});

describe("pageJobAttemptsExhausted", () => {
  it("terminalizes queued jobs at or beyond their retry limit", () => {
    expect(pageJobAttemptsExhausted(1, 2)).toBe(false);
    expect(pageJobAttemptsExhausted(2, 2)).toBe(true);
    expect(pageJobAttemptsExhausted(3, 2)).toBe(true);
  });
});

describe("partial-success state", () => {
  it("distinguishes clean, partial, and all-failed terminal states", () => {
    expect(terminalScanPhase(5, 0)).toBe("completed");
    expect(terminalScanPhase(4, 1)).toBe("completed_with_errors");
    expect(terminalScanPhase(0, 5)).toBe("failed");
  });
});

describe("sweepPageJobs", () => {
  it("requeues a stale first attempt", () => {
    expect(sweepPageJobs(NOW, [job()], thresholds)).toEqual([
      {
        type: "requeue",
        workspaceId: "ws-1",
        scanId: "scan-1",
        pageJobId: "page-1",
        previousAttempts: 1,
      },
    ]);
  });

  it("fails a stale exhausted attempt", () => {
    expect(sweepPageJobs(NOW, [job({ attempts: 2 })], thresholds)).toEqual([
      expect.objectContaining({
        type: "fail",
        pageJobId: "page-1",
        errorCode: "worker_heartbeat_stale",
        attempts: 2,
      }),
    ]);
  });

  it("leaves fresh, queued, and terminal jobs untouched", () => {
    expect(
      sweepPageJobs(
        NOW,
        [
          job({ id: "fresh", heartbeatAt: new Date(NOW - 10_000) }),
          job({ id: "queued", status: "queued" }),
          job({ id: "done", status: "completed" }),
          job({ id: "failed", status: "failed" }),
        ],
        thresholds
      )
    ).toEqual([]);
  });
});
