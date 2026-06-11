import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  auditMock,
  findIssueInWorkspaceMock,
  updateIssueMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  auditMock: vi.fn(),
  findIssueInWorkspaceMock: vi.fn(),
  updateIssueMock: vi.fn(),
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
  findIssueInWorkspace: findIssueInWorkspaceMock,
  updateIssue: updateIssueMock,
}));

import { PATCH } from "./[id]/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/issues/issue-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "issue-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionMock.mockResolvedValue({ userId: "user-1", workspaceId: "ws-1", role: "owner" });
  findIssueInWorkspaceMock.mockResolvedValue({
    issue: { id: "issue-1", status: "to_review" },
    scan: { id: "scan-1" },
  });
  updateIssueMock.mockImplementation(async (_ws, _scan, id, patch) => ({
    id,
    status: "to_review",
    falsePositive: false,
    ...patch,
  }));
});

describe("PATCH /api/issues/[id]", () => {
  it("persists a status change and returns the updated issue", async () => {
    const res = await PATCH(request({ status: "fixed" }), params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(updateIssueMock).toHaveBeenCalledWith("ws-1", "scan-1", "issue-1", {
      status: "fixed",
    });
    expect(body.issue.status).toBe("fixed");
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "issue.updated" })
    );
  });

  it("links false-positive flag and status together", async () => {
    await PATCH(request({ falsePositive: true }), params);

    expect(updateIssueMock).toHaveBeenCalledWith("ws-1", "scan-1", "issue-1", {
      falsePositive: true,
      status: "false_positive",
    });
  });

  it("rejects empty patches", async () => {
    const res = await PATCH(request({}), params);

    expect(res.status).toBe(400);
    expect(updateIssueMock).not.toHaveBeenCalled();
  });

  it("rejects unknown statuses", async () => {
    const res = await PATCH(request({ status: "done" }), params);

    expect(res.status).toBe(400);
    expect(updateIssueMock).not.toHaveBeenCalled();
  });

  it("requires the manage_remediation permission", async () => {
    requireSessionMock.mockResolvedValue({ userId: "u", workspaceId: "ws-1", role: "client_viewer" });

    const res = await PATCH(request({ status: "fixed" }), params);

    expect(res.status).toBe(403);
    expect(updateIssueMock).not.toHaveBeenCalled();
  });

  it("404s when the issue is not in the workspace", async () => {
    findIssueInWorkspaceMock.mockResolvedValue(null);

    const res = await PATCH(request({ status: "fixed" }), params);

    expect(res.status).toBe(404);
  });
});
