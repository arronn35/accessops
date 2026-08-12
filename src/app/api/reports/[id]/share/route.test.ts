import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  auditMock,
  getReportMock,
  setReportShareMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  auditMock: vi.fn(),
  getReportMock: vi.fn(),
  setReportShareMock: vi.fn(),
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
  audit: auditMock,
  getReport: getReportMock,
  setReportShare: setReportShareMock,
}));

import { POST } from "./route";

const VALID_SESSION = {
  userId: "user-1",
  workspaceId: "ws-1",
  role: "owner",
};

const REPORT = {
  id: "rep-1",
  workspaceId: "ws-1",
  scanJobId: "scan-1",
  title: "Test Report",
  publicShareToken: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionMock.mockResolvedValue(VALID_SESSION);
  getReportMock.mockResolvedValue(REPORT);
  setReportShareMock.mockResolvedValue(undefined);
  auditMock.mockResolvedValue(undefined);
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/reports/rep-1/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports/[id]/share", () => {
  it("rejects when role has no export_reports permission", async () => {
    requireSessionMock.mockResolvedValue({
      ...VALID_SESSION,
      role: "report_viewer", // does not have export_reports
    });

    const res = await POST(postRequest({ public: true }), {
      params: Promise.resolve({ id: "rep-1" }),
    });

    expect(res.status).toBe(403);
    expect(setReportShareMock).not.toHaveBeenCalled();
  });

  it("allows owner and admin roles to toggle report sharing", async () => {
    const res = await POST(postRequest({ public: true }), {
      params: Promise.resolve({ id: "rep-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.public).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.shareUrl).toContain(`/r/`);
    expect(setReportShareMock).toHaveBeenCalledWith("ws-1", "rep-1", body.token);
  });

  it("allows revoking report sharing", async () => {
    const res = await POST(postRequest({ public: false }), {
      params: Promise.resolve({ id: "rep-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.public).toBe(false);
    expect(setReportShareMock).toHaveBeenCalledWith("ws-1", "rep-1", null);
  });
});
