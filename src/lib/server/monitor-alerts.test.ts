/**
 * F11 acceptance at the dispatch layer: an unchanged scan is silent, a new
 * critical finding produces one notification, and running the sweep again --
 * or retrying the monitor -- produces no duplicate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMock, getScanJobMock, resolveMock, auditMock, updateMonitorMock, captureMock } =
  vi.hoisted(() => ({
    listMock: vi.fn(),
    getScanJobMock: vi.fn(),
    resolveMock: vi.fn(),
    auditMock: vi.fn(),
    updateMonitorMock: vi.fn(),
    captureMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  getScanJob: getScanJobMock,
  listMonitorsWithUnalertedScans: listMock,
  updateMonitor: updateMonitorMock,
}));
vi.mock("@/lib/server/compare", () => ({ resolveComparison: resolveMock }));
vi.mock("@/lib/observability", () => ({ captureException: captureMock }));

import { dispatchMonitorRegressionAlerts } from "./monitor-alerts";

const monitor = {
  id: "mon-1",
  workspaceId: "ws-1",
  targetUrl: "https://example.com",
  createdBy: "user-1",
  lastScanId: "scan-2",
  lastAlertedScanId: null,
  alertThreshold: { onNewCritical: true, onScoreDropBy: 10 },
};

const coverage = {
  missingFromAfter: [],
  addedInAfter: [],
  afterFailedPageCount: 0,
  identityComparable: true,
  scopeEquivalent: true,
};

const emptyTotals = {
  fixed: 0, new: 0, remaining: 0, notObserved: 0, inconclusive: 0,
  instancesResolved: 0, instancesIntroduced: 0,
};

function comparison(over: Record<string, unknown> = {}) {
  return {
    comparable: true,
    comparison: {
      fixed: [], newIssues: [], remaining: [], manualReview: [],
      notObserved: [], inconclusive: [], coverage,
      totals: emptyTotals, score: null,
      ...over,
    },
  };
}

const criticalGroup = {
  rootCauseKey: "k", ruleId: "button-name", title: "Buttons missing names",
  severity: "critical", primaryWcagTag: "wcag412", priority: 10,
  beforeCount: 0, afterCount: 2, status: "new",
};

beforeEach(() => {
  listMock.mockReset().mockResolvedValue([monitor]);
  getScanJobMock.mockReset().mockResolvedValue({ id: "scan-2", status: "completed" });
  resolveMock.mockReset().mockResolvedValue(comparison());
  auditMock.mockReset().mockResolvedValue(undefined);
  updateMonitorMock.mockReset().mockResolvedValue(null);
  captureMock.mockReset();
});

describe("dispatchMonitorRegressionAlerts", () => {
  it("writes nothing for an unchanged scan, but marks it evaluated", async () => {
    const out = await dispatchMonitorRegressionAlerts();

    expect(auditMock).not.toHaveBeenCalled();
    expect(out).toEqual({ evaluated: 1, alerted: 0, skipped: 0 });
    // Marked, or the sweep would re-diff this scan every couple of minutes.
    expect(updateMonitorMock).toHaveBeenCalledWith("ws-1", "mon-1", {
      lastAlertedScanId: "scan-2",
    });
  });

  it("raises one notification for a new critical finding", async () => {
    resolveMock.mockResolvedValue(comparison({ newIssues: [criticalGroup] }));

    const out = await dispatchMonitorRegressionAlerts();

    expect(out.alerted).toBe(1);
    expect(auditMock).toHaveBeenCalledTimes(1);
    expect(auditMock.mock.calls[0][0]).toMatchObject({
      action: "monitor.new_critical",
      workspaceId: "ws-1",
      resourceId: "scan-2",
      dedupeKey: "regression-scan-2-new_critical",
    });
  });

  it("uses the same dedupe key on a repeat run, so nothing duplicates", async () => {
    resolveMock.mockResolvedValue(comparison({ newIssues: [criticalGroup] }));

    await dispatchMonitorRegressionAlerts();
    await dispatchMonitorRegressionAlerts();

    const keys = auditMock.mock.calls.map((c) => c[0].dedupeKey);
    expect(new Set(keys).size).toBe(1);
  });

  it("leaves a still-running scan alone so it is evaluated once it finishes", async () => {
    getScanJobMock.mockResolvedValue({ id: "scan-2", status: "running" });

    const out = await dispatchMonitorRegressionAlerts();

    expect(out).toEqual({ evaluated: 0, alerted: 0, skipped: 1 });
    expect(resolveMock).not.toHaveBeenCalled();
    expect(updateMonitorMock).not.toHaveBeenCalled();
  });

  it("stays silent when the comparison is not usable", async () => {
    resolveMock.mockResolvedValue({ comparable: false, reason: "no_prior_scan" });

    const out = await dispatchMonitorRegressionAlerts();

    expect(auditMock).not.toHaveBeenCalled();
    expect(out.evaluated).toBe(1);
  });

  it("does not let one broken monitor stop the others", async () => {
    listMock.mockResolvedValue([monitor, { ...monitor, id: "mon-2" }]);
    resolveMock
      .mockRejectedValueOnce(new Error("firestore exploded"))
      .mockResolvedValue(comparison({ newIssues: [criticalGroup] }));

    const out = await dispatchMonitorRegressionAlerts();

    expect(out.skipped).toBe(1);
    expect(out.alerted).toBe(1);
    expect(captureMock).toHaveBeenCalled();
  });
});
