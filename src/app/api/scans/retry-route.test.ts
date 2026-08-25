import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  checkRateLimitMock,
  auditMock,
  clearScanResultCollectionsMock,
  countInflightScansMock,
  deletePageJobsMock,
  getScanJobMock,
  getWorkspaceMock,
  reserveScanQuotaMock,
  updateScanJobMock,
  afterMock,
  enqueueScanTaskMock,
  getLatestWorkerHeartbeatMock,
  isWorkerHeartbeatFreshMock,
  processScanInlineMock,
  scanDispatchConfigurationMock,
  scanDispatchModeMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  auditMock: vi.fn(),
  clearScanResultCollectionsMock: vi.fn(),
  countInflightScansMock: vi.fn(),
  deletePageJobsMock: vi.fn(),
  getScanJobMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  reserveScanQuotaMock: vi.fn(),
  updateScanJobMock: vi.fn(),
  afterMock: vi.fn(),
  enqueueScanTaskMock: vi.fn(),
  getLatestWorkerHeartbeatMock: vi.fn(),
  isWorkerHeartbeatFreshMock: vi.fn(),
  processScanInlineMock: vi.fn(),
  scanDispatchConfigurationMock: vi.fn(),
  scanDispatchModeMock: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: afterMock,
}));

vi.mock("@/lib/api/context", () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message?: string,
      public readonly headers?: Record<string, string>
    ) {
      super(message ?? code);
    }
  }
  return {
    ApiError,
    requireSession: requireSessionMock,
    rateLimitError: (reset: number, remaining = 0, message = "Too many requests.") =>
      new ApiError(429, "rate_limited", message, {
        "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
        "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
      }),
    apiError: (err: unknown) => {
      if (err instanceof ApiError) {
        return Response.json(
          { error: err.code, message: err.message },
          { status: err.status, headers: err.headers }
        );
      }
      return Response.json({ error: "internal" }, { status: 500 });
    },
  };
});

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  clearScanResultCollections: clearScanResultCollectionsMock,
  countInflightScans: countInflightScansMock,
  deletePageJobs: deletePageJobsMock,
  getScanJob: getScanJobMock,
  getWorkspace: getWorkspaceMock,
  reserveScanQuota: reserveScanQuotaMock,
  updateScanJob: updateScanJobMock,
}));

vi.mock("@/lib/data/worker-health", () => ({
  getLatestWorkerHeartbeat: getLatestWorkerHeartbeatMock,
  isWorkerHeartbeatFresh: isWorkerHeartbeatFreshMock,
}));

vi.mock("@/lib/scanner/dispatch", () => ({
  enqueueScanTask: enqueueScanTaskMock,
  scanDispatchConfiguration: scanDispatchConfigurationMock,
  scanDispatchMode: scanDispatchModeMock,
}));

vi.mock("@/lib/scanner/inline-runner", () => ({
  processScanInline: processScanInlineMock,
}));

vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

import { POST } from "./[id]/retry/route";
import type { ScanJob } from "@/lib/data/types";

const ctx = { userId: "user-1", workspaceId: "ws-1", role: "owner" };

function scan(overrides: Partial<ScanJob> = {}): ScanJob {
  const now = new Date();
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    projectId: null,
    requestedBy: "user-1",
    scanType: "single",
    status: "failed",
    baseUrl: "https://example.com",
    sourceUrlsJson: null,
    maxPages: 1,
    pagesDiscovered: 1,
    pagesScanned: 1,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "failed",
    startedAt: now,
    completedAt: now,
    errorMessage: "previous failure",
    queueAttempts: 3,
    lastQueuePublishedAt: now,
    processorStartedAt: now,
    processorHeartbeatAt: now,
    processorError: "previous failure",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function params() {
  return { params: Promise.resolve({ id: "scan-1" }) };
}

beforeEach(() => {
  requireSessionMock.mockReset().mockResolvedValue(ctx);
  checkRateLimitMock.mockReset().mockResolvedValue({ ok: true, remaining: 4, reset: 0 });
  auditMock.mockReset().mockResolvedValue(undefined);
  clearScanResultCollectionsMock.mockReset().mockResolvedValue(undefined);
  countInflightScansMock.mockReset().mockResolvedValue(0);
  deletePageJobsMock.mockReset().mockResolvedValue(0);
  getScanJobMock.mockReset();
  getWorkspaceMock.mockReset().mockResolvedValue({ id: "ws-1", plan: "free" });
  reserveScanQuotaMock.mockReset().mockResolvedValue({
    maxPages: 1,
    usage: {},
  });
  updateScanJobMock.mockReset().mockResolvedValue(undefined);
  afterMock.mockReset();
  enqueueScanTaskMock.mockReset().mockResolvedValue({ enqueued: true });
  getLatestWorkerHeartbeatMock.mockReset().mockResolvedValue(new Date());
  isWorkerHeartbeatFreshMock.mockReset().mockReturnValue(true);
  processScanInlineMock.mockReset().mockResolvedValue(undefined);
  scanDispatchConfigurationMock.mockReset().mockReturnValue({
    mode: "poll",
    configured: true,
    missing: [],
  });
  scanDispatchModeMock.mockReset().mockReturnValue("poll");
});

describe("POST /api/scans/[id]/retry", () => {
  it("resets a failed scan to queued for the polling worker", async () => {
    getScanJobMock.mockResolvedValue(scan());

    const res = await POST(new Request("http://test/api/scans/scan-1/retry") as never, params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, scanJobId: "scan-1", mode: "queued" });
    expect(updateScanJobMock).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({
        status: "queued",
        progressStep: "queued",
        maxPages: 1,
        queueAttempts: 0,
        lastQueuePublishedAt: null,
        processorStartedAt: null,
        processorHeartbeatAt: null,
        processorError: null,
      })
    );
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "scan.retried", metadata: { mode: "queued" } })
    );
    expect(countInflightScansMock).toHaveBeenCalledWith("ws-1", "scan-1");
    expect(reserveScanQuotaMock).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      plan: "free",
      maxPages: 1,
    });
  });

  it("runs the static fallback when retrying with a stale poll worker", async () => {
    getScanJobMock.mockResolvedValue(scan());
    isWorkerHeartbeatFreshMock.mockReturnValue(false);

    const res = await POST(
      new Request("http://test/api/scans/scan-1/retry") as never,
      params()
    );
    const body = await res.json();

    expect(body.mode).toBe("inline_static");
    expect(updateScanJobMock).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({
        status: "queued",
        errorMessage:
          "The browser scanner is temporarily unavailable. This scan will run in limited static HTML mode.",
      })
    );
    expect(afterMock).toHaveBeenCalledOnce();
    const task = afterMock.mock.calls[0][0] as () => Promise<void>;
    await task();
    expect(processScanInlineMock).toHaveBeenCalledWith("scan-1", {
      allowQueueFailureFallback: true,
    });
  });

  it("re-enqueues a Cloud Task when retrying in push mode", async () => {
    getScanJobMock.mockResolvedValue(scan());
    scanDispatchModeMock.mockReturnValue("cloud-tasks");
    scanDispatchConfigurationMock.mockReturnValue({
      mode: "cloud-tasks",
      configured: true,
      missing: [],
    });

    const res = await POST(
      new Request("http://test/api/scans/scan-1/retry") as never,
      params()
    );

    expect(res.status).toBe(200);
    expect(enqueueScanTaskMock).toHaveBeenCalledWith({
      scanJobId: "scan-1",
      reason: "scan_retried",
    });
  });

  it("rejects a role without create_scans permission before reading the scan", async () => {
    requireSessionMock.mockResolvedValue({
      ...ctx,
      role: "report_viewer",
    });

    const res = await POST(
      new Request("http://test/api/scans/scan-1/retry") as never,
      params()
    );

    expect(res.status).toBe(403);
    expect(getScanJobMock).not.toHaveBeenCalled();
    expect(reserveScanQuotaMock).not.toHaveBeenCalled();
    expect(updateScanJobMock).not.toHaveBeenCalled();
  });

  it("rejects retry when another scan already uses the workspace concurrency slot", async () => {
    getScanJobMock.mockResolvedValue(scan());
    countInflightScansMock.mockResolvedValue(1);

    const res = await POST(
      new Request("http://test/api/scans/scan-1/retry") as never,
      params()
    );
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("scan_concurrency_limit");
    expect(countInflightScansMock).toHaveBeenCalledWith("ws-1", "scan-1");
    expect(reserveScanQuotaMock).not.toHaveBeenCalled();
    expect(updateScanJobMock).not.toHaveBeenCalled();
  });

  it("rejects retry without mutating scan state when the daily plan quota is exhausted", async () => {
    getScanJobMock.mockResolvedValue(scan({ usePageJobs: true }));
    reserveScanQuotaMock.mockRejectedValue(
      new Error("daily_workspace_capacity_reached:3")
    );

    const res = await POST(
      new Request("http://test/api/scans/scan-1/retry") as never,
      params()
    );
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("daily_scan_limit");
    expect(clearScanResultCollectionsMock).not.toHaveBeenCalled();
    expect(deletePageJobsMock).not.toHaveBeenCalled();
    expect(updateScanJobMock).not.toHaveBeenCalled();
  });

  it("applies the current plan page cap to a retried scan", async () => {
    getScanJobMock.mockResolvedValue(scan({ maxPages: 100 }));
    reserveScanQuotaMock.mockResolvedValue({
      maxPages: 3,
      usage: {},
    });

    const res = await POST(
      new Request("http://test/api/scans/scan-1/retry") as never,
      params()
    );

    expect(res.status).toBe(200);
    expect(reserveScanQuotaMock).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      plan: "free",
      maxPages: 3,
    });
    expect(updateScanJobMock).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({ maxPages: 3 })
    );
  });

  it("allows retry from the legacy queue_retry_pending progress step", async () => {
    getScanJobMock.mockResolvedValue(scan({ status: "queued", progressStep: "queue_retry_pending" }));

    const res = await POST(new Request("http://test/api/scans/scan-1/retry") as never, params());

    expect(res.status).toBe(200);
    expect(updateScanJobMock).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({ status: "queued", progressStep: "queued" })
    );
  });

  it("rejects retry for an active running scan", async () => {
    getScanJobMock.mockResolvedValue(scan({ status: "running", progressStep: "scanning" }));

    const res = await POST(new Request("http://test/api/scans/scan-1/retry") as never, params());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("not_retryable");
    expect(updateScanJobMock).not.toHaveBeenCalled();
  });

  it("allows retry for a stale running scan", async () => {
    getScanJobMock.mockResolvedValue(
      scan({
        status: "running",
        progressStep: "scanning",
        startedAt: new Date(Date.now() - 10 * 60_000),
        processorStartedAt: new Date(Date.now() - 10 * 60_000),
        processorHeartbeatAt: null,
        updatedAt: new Date(Date.now() - 10 * 60_000),
      })
    );

    const res = await POST(new Request("http://test/api/scans/scan-1/retry") as never, params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, scanJobId: "scan-1", mode: "queued" });
    expect(updateScanJobMock).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({
        status: "queued",
        progressStep: "queued",
        processorHeartbeatAt: null,
        processorError: null,
      })
    );
  });
});
