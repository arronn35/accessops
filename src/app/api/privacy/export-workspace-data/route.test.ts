import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requirePermissionMock,
  auditMock,
  getWorkspaceMock,
  getPrivacySettingsMock,
  listScansMock,
  listIssuesMock,
  listRemediationTasksMock,
  listReportsMock,
  listAuditLogsMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  auditMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  getPrivacySettingsMock: vi.fn(),
  listScansMock: vi.fn(),
  listIssuesMock: vi.fn(),
  listRemediationTasksMock: vi.fn(),
  listReportsMock: vi.fn(),
  listAuditLogsMock: vi.fn(),
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
    requirePermission: requirePermissionMock,
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
  getWorkspace: getWorkspaceMock,
  getPrivacySettings: getPrivacySettingsMock,
  listScans: listScansMock,
  listIssues: listIssuesMock,
  listRemediationTasks: listRemediationTasksMock,
  listReports: listReportsMock,
  listAuditLogs: listAuditLogsMock,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-1",
    role: "owner",
  });
  getWorkspaceMock.mockResolvedValue({ id: "ws-1", name: "My Workspace" });
  getPrivacySettingsMock.mockResolvedValue({ id: "priv-1", workspaceId: "ws-1" });
  listScansMock.mockResolvedValue([{ id: "scan-1" }]);
  listIssuesMock.mockResolvedValue([{ id: "issue-1", scanJobId: "scan-1", ruleId: "alt-text" }]);
  listRemediationTasksMock.mockResolvedValue([{ id: "task-1" }]);
  listReportsMock.mockResolvedValue([{ id: "rep-1" }]);
  listAuditLogsMock.mockResolvedValue([{ id: "log-1" }]);
  auditMock.mockResolvedValue(undefined);
});

describe("GET /api/privacy/export-workspace-data", () => {
  it("requires manage_privacy permission", async () => {
    const { ApiError } = await import("@/lib/api/context");
    requirePermissionMock.mockRejectedValue(new ApiError(403, "forbidden"));

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("exports all scans, issues, tasks, reports, and logs", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.workspace.name).toBe("My Workspace");
    expect(body.scans).toHaveLength(1);
    expect(body.issues).toHaveLength(1);
    expect(body.issues[0].ruleId).toBe("alt-text");
    expect(body.tasks).toHaveLength(1);
    expect(body.reports).toHaveLength(1);
    expect(body.auditLogs).toHaveLength(1);

    expect(res.headers.get("content-disposition")).toContain("percevia-workspace-ws-1.json");
    expect(auditMock).toHaveBeenCalledWith({
      userId: "user-1",
      workspaceId: "ws-1",
      action: "privacy.workspace_exported",
      resourceType: "workspace",
      resourceId: "ws-1",
    });
  });
});
