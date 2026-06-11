import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requirePermissionMock,
  auditMock,
  createDataDeletionJobMock,
  getLatestDataDeletionJobMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  auditMock: vi.fn(),
  createDataDeletionJobMock: vi.fn(),
  getLatestDataDeletionJobMock: vi.fn(),
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
}));

vi.mock("@/lib/data/deletion", () => ({
  createDataDeletionJob: createDataDeletionJobMock,
  getLatestDataDeletionJob: getLatestDataDeletionJobMock,
}));

import { GET, POST } from "./route";

function job(overrides: Record<string, unknown> = {}) {
  const at = new Date("2026-06-10T12:00:00.000Z");
  return {
    id: "job-1",
    workspaceId: "ws-1",
    scope: "all_scan_data",
    status: "queued",
    requestedBy: "user-1",
    claimedBy: null,
    attempts: 0,
    startedAt: null,
    heartbeatAt: null,
    completedAt: null,
    deletedCounts: null,
    verifiedAt: null,
    error: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/privacy/delete-scan-data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-1",
    role: "owner",
  });
});

describe("POST /api/privacy/delete-scan-data", () => {
  it("rejects requests without the DELETE confirmation", async () => {
    const res = await POST(postRequest({ all: true }));

    expect(res.status).toBe(400);
    expect(createDataDeletionJobMock).not.toHaveBeenCalled();
  });

  it("queues a tracked deletion job and responds 202", async () => {
    createDataDeletionJobMock.mockResolvedValue({ job: job(), created: true });

    const res = await POST(postRequest({ confirm: "DELETE" }));
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.job.id).toBe("job-1");
    expect(body.job.status).toBe("queued");
    expect(createDataDeletionJobMock).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      requestedBy: "user-1",
    });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "privacy.scan_data_deletion_requested" })
    );
  });

  it("returns the existing job without a duplicate audit entry", async () => {
    createDataDeletionJobMock.mockResolvedValue({ job: job(), created: false });

    const res = await POST(postRequest({ confirm: "DELETE" }));

    expect(res.status).toBe(202);
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("requires the delete_scans permission", async () => {
    const { ApiError } = await import("@/lib/api/context");
    requirePermissionMock.mockRejectedValue(new ApiError(403, "forbidden"));

    const res = await POST(postRequest({ confirm: "DELETE" }));

    expect(res.status).toBe(403);
    expect(createDataDeletionJobMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/privacy/delete-scan-data", () => {
  it("returns the most recent job", async () => {
    getLatestDataDeletionJobMock.mockResolvedValue(
      job({ status: "completed", verifiedAt: new Date(), deletedCounts: { scans: 4 } })
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.job.status).toBe("completed");
    expect(body.job.deletedCounts).toEqual({ scans: 4 });
  });

  it("returns null when no deletion was ever requested", async () => {
    getLatestDataDeletionJobMock.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.job).toBeNull();
  });
});
