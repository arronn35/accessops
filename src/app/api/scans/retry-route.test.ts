import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  checkRateLimitMock,
  auditMock,
  getScanJobMock,
  updateScanJobMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  auditMock: vi.fn(),
  getScanJobMock: vi.fn(),
  updateScanJobMock: vi.fn(),
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
  getScanJob: getScanJobMock,
  updateScanJob: updateScanJobMock,
}));

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
  getScanJobMock.mockReset();
  updateScanJobMock.mockReset().mockResolvedValue(undefined);
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
