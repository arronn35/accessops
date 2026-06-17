/**
 * Integration-style tests for POST/GET /api/monitors.
 *
 * Mocks the session, rate-independent data layer, and validation seams; the
 * real entitlement gating (monitorCapsForPlan) and schedule math run so the
 * plan limits are genuinely exercised.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  requirePermissionMock,
  auditMock,
  countMonitorsMock,
  createMonitorMock,
  listMonitorsMock,
  getWorkspaceMock,
  getScanJobMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  auditMock: vi.fn(),
  countMonitorsMock: vi.fn(),
  createMonitorMock: vi.fn(),
  listMonitorsMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  getScanJobMock: vi.fn(),
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
    requirePermission: requirePermissionMock,
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

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  countMonitors: countMonitorsMock,
  createMonitor: createMonitorMock,
  listMonitors: listMonitorsMock,
  getWorkspace: getWorkspaceMock,
  getScanJob: getScanJobMock,
}));

vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

import { POST, GET } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/monitors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CTX = { userId: "user-1", workspaceId: "ws-1", role: "owner" };

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue(CTX);
  auditMock.mockReset().mockResolvedValue(undefined);
  countMonitorsMock.mockReset().mockResolvedValue(0);
  createMonitorMock.mockReset().mockResolvedValue({ id: "mon-1" });
  listMonitorsMock.mockReset().mockResolvedValue([]);
  getWorkspaceMock.mockReset().mockResolvedValue({ id: "ws-1", plan: "agency" });
  getScanJobMock.mockReset().mockResolvedValue(null);
});

describe("POST /api/monitors", () => {
  it("creates a monitor on a paid plan", async () => {
    const res = await POST(
      makeRequest({ targetUrl: "https://example.com", frequency: "weekly" }) as never
    );
    expect(res.status).toBe(201);
    expect(createMonitorMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ targetUrl: "https://example.com", frequency: "weekly" })
    );
  });

  it("blocks monitoring entirely on the free plan (403)", async () => {
    getWorkspaceMock.mockResolvedValue({ id: "ws-1", plan: "free" });
    const res = await POST(
      makeRequest({ targetUrl: "https://example.com", frequency: "weekly" }) as never
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("monitoring_not_available");
    expect(createMonitorMock).not.toHaveBeenCalled();
  });

  it("rejects a frequency the plan does not allow (403)", async () => {
    getWorkspaceMock.mockResolvedValue({ id: "ws-1", plan: "starter" }); // weekly only
    const res = await POST(
      makeRequest({ targetUrl: "https://example.com", frequency: "daily" }) as never
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("frequency_not_allowed");
  });

  it("defaults frequency to the slowest allowed cadence when omitted", async () => {
    getWorkspaceMock.mockResolvedValue({ id: "ws-1", plan: "starter" });
    const res = await POST(makeRequest({ targetUrl: "https://example.com" }) as never);
    expect(res.status).toBe(201);
    expect(createMonitorMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ frequency: "weekly" })
    );
  });

  it("enforces the per-plan monitor cap (409)", async () => {
    getWorkspaceMock.mockResolvedValue({ id: "ws-1", plan: "starter" }); // max 3
    countMonitorsMock.mockResolvedValue(3);
    const res = await POST(
      makeRequest({ targetUrl: "https://example.com", frequency: "weekly" }) as never
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("monitor_limit_reached");
    expect(createMonitorMock).not.toHaveBeenCalled();
  });

  it("rejects a private-IP target via the SSRF guard (400)", async () => {
    const res = await POST(
      makeRequest({ targetUrl: "http://10.0.0.5/", frequency: "weekly" }) as never
    );
    expect(res.status).toBe(400);
    expect(createMonitorMock).not.toHaveBeenCalled();
  });

  it("requires either fromScanId or targetUrl (400)", async () => {
    const res = await POST(makeRequest({ frequency: "weekly" }) as never);
    expect(res.status).toBe(400);
  });

  it("seeds target + config from an existing scan via fromScanId", async () => {
    getScanJobMock.mockResolvedValue({
      id: "scan-9",
      baseUrl: "https://seeded-site.org",
      scanType: "single",
      maxPages: 2,
      includeScreenshots: false,
    });
    const res = await POST(makeRequest({ fromScanId: "scan-9" }) as never);
    expect(res.status).toBe(201);
    expect(createMonitorMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ targetUrl: "https://seeded-site.org" })
    );
  });
});

describe("GET /api/monitors", () => {
  it("lists monitors for the workspace", async () => {
    listMonitorsMock.mockResolvedValue([{ id: "mon-1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monitors).toHaveLength(1);
  });
});
