import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  getScanJobMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getScanJobMock: vi.fn(),
}));

vi.mock("@/lib/api/context", () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message?: string
    ) {
      super(message ?? code);
    }
  }
  return {
    ApiError,
    requireSession: requireSessionMock,
    apiError: (err: unknown) => {
      if (err instanceof ApiError) {
        return Response.json(
          { error: err.code, message: err.message },
          { status: err.status }
        );
      }
      return Response.json({ error: "internal" }, { status: 500 });
    },
  };
});

vi.mock("@/lib/data/firestore", () => ({
  getScanJob: getScanJobMock,
}));

vi.mock("@/lib/scanner/inline-runner", () => {
  throw new Error("status route must not import inline scan processing");
});

import { GET } from "./[id]/status/route";
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
    status: "queued",
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
    progressStep: "queued",
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    queueAttempts: 1,
    lastQueuePublishedAt: new Date(Date.now() - 60_000),
    processorStartedAt: null,
    processorHeartbeatAt: null,
    processorError: null,
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
  getScanJobMock.mockReset();
});

let current: ScanJob;

describe("GET /api/scans/[id]/status", () => {
  it("keeps an old queued scan queued without queue republish or false failure", async () => {
    current = scan({
      queueAttempts: 99,
      createdAt: new Date(Date.now() - 30 * 60_000),
      lastQueuePublishedAt: new Date(Date.now() - 30 * 60_000),
    });
    getScanJobMock.mockImplementation(async () => current);

    const res = await GET(new Request("http://test/api/scans/scan-1/status") as never, params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("queued");
    expect(body.errorMessage).toBeNull();
  });

  it("reports a stale running heartbeat without terminally failing the scan", async () => {
    current = scan({
      status: "running",
      progressStep: "scanning",
      startedAt: new Date(Date.now() - 10 * 60_000),
      processorStartedAt: new Date(Date.now() - 10 * 60_000),
      processorHeartbeatAt: new Date(Date.now() - 10 * 60_000),
    });
    getScanJobMock.mockImplementation(async () => current);

    const res = await GET(new Request("http://test/api/scans/scan-1/status") as never, params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("running");
    expect(body.progressStep).toBe("scanning");
    expect(body.workerHeartbeatStale).toBe(true);
  });

  it("reports a running scan with a missing heartbeat as stale when the lifecycle helper flags it", async () => {
    current = scan({
      status: "running",
      progressStep: "scanning",
      startedAt: new Date(Date.now() - 10 * 60_000),
      processorStartedAt: new Date(Date.now() - 10 * 60_000),
      processorHeartbeatAt: null,
    });
    getScanJobMock.mockImplementation(async () => current);

    const res = await GET(new Request("http://test/api/scans/scan-1/status") as never, params());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("running");
    expect(body.workerHeartbeatStale).toBe(true);
  });
});
