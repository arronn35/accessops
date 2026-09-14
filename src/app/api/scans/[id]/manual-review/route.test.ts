/**
 * Manual-review API: role matrix and reviewer attribution.
 *
 * Attribution is the point of the feature — a review nobody can be held to is
 * not evidence — so the reviewer identity must come from the session and never
 * from the request body.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLE_PERMISSIONS, type WorkspaceRole } from "@/lib/entitlements";

const { currentRole, getScanJobMock, getUserMock, listMock, upsertMock, auditMock } =
  vi.hoisted(() => ({
    currentRole: { value: "owner" as WorkspaceRole },
    getScanJobMock: vi.fn(),
    getUserMock: vi.fn(),
    listMock: vi.fn(),
    upsertMock: vi.fn(),
    auditMock: vi.fn(),
  }));

vi.mock("@/lib/api/context", async () => {
  const { roleHasPermission } = await import("@/lib/entitlements");
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
    requireSession: async () => ({
      userId: "user-1",
      workspaceId: "ws-1",
      role: currentRole.value,
    }),
    requirePermission: async (permission: string) => {
      if (!roleHasPermission(currentRole.value, permission as never)) {
        throw new ApiError(403, "forbidden");
      }
      return { userId: "user-1", workspaceId: "ws-1", role: currentRole.value };
    },
    apiError: (err: unknown) => {
      if (err instanceof ApiError) {
        return Response.json({ error: err.code }, { status: err.status });
      }
      return Response.json({ error: "internal" }, { status: 500 });
    },
  };
});

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  getScanJob: getScanJobMock,
  getUser: getUserMock,
  listManualReviews: listMock,
  upsertManualReview: upsertMock,
}));

import { GET, PUT } from "./route";

const params = Promise.resolve({ id: "scan-1" });
const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as WorkspaceRole[];

function put(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/scans/scan-1/manual-review", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  currentRole.value = "owner";
  getScanJobMock.mockReset().mockResolvedValue({ id: "scan-1" });
  getUserMock.mockReset().mockResolvedValue({
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
  listMock.mockReset().mockResolvedValue([]);
  upsertMock.mockReset().mockImplementation(async (_ws, _scan, input) => ({
    ...input,
    id: input.checkId,
    revision: 1,
  }));
  auditMock.mockReset().mockResolvedValue(undefined);
});

describe("manual-review route", () => {
  it.each(ALL_ROLES)("GET for %s follows view_scans", async (role) => {
    currentRole.value = role;
    const res = await GET(new Request("http://localhost"), { params });

    expect(res.status).toBe(ROLE_PERMISSIONS[role].view_scans ? 200 : 403);
  });

  it.each(ALL_ROLES)("PUT for %s follows manage_manual_review", async (role) => {
    currentRole.value = role;
    const res = await PUT(put({ checkId: "keyboard", status: "passed" }), { params });

    const allowed = ROLE_PERMISSIONS[role].manage_manual_review;
    expect(res.status).toBe(allowed ? 200 : 403);
    if (!allowed) expect(upsertMock).not.toHaveBeenCalled();
  });

  it("lets an auditor record a review even though they cannot manage remediation", async () => {
    currentRole.value = "auditor";
    expect(ROLE_PERMISSIONS.auditor.manage_remediation).toBe(false);

    const res = await PUT(put({ checkId: "keyboard", status: "failed" }), { params });

    expect(res.status).toBe(200);
  });

  it("takes the reviewer identity from the session, not the body", async () => {
    await PUT(
      put({
        checkId: "keyboard",
        status: "passed",
        reviewerUserId: "someone-else",
        reviewerName: "Not Ada",
      }),
      { params }
    );

    const [, , input] = upsertMock.mock.calls[0];
    expect(input.reviewerUserId).toBe("user-1");
    expect(input.reviewerName).toBe("Ada Lovelace");
  });

  it("attaches the check's WCAG criteria from the shared definitions", async () => {
    await PUT(put({ checkId: "keyboard", status: "passed" }), { params });

    const [, , input] = upsertMock.mock.calls[0];
    expect(input.wcagCriteria).toEqual(["2.1.1", "2.1.2"]);
  });

  it("rejects a check id the product does not define", async () => {
    const res = await PUT(put({ checkId: "made-up", status: "passed" }), { params });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("unknown_check");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown status", async () => {
    const res = await PUT(put({ checkId: "keyboard", status: "maybe" }), { params });

    expect(res.status).toBe(400);
  });

  it("normalises a whitespace-only note to null", async () => {
    await PUT(put({ checkId: "keyboard", status: "passed", notes: "   " }), { params });

    expect(upsertMock.mock.calls[0][2].notes).toBeNull();
  });

  it("404s for a scan outside the workspace", async () => {
    getScanJobMock.mockResolvedValue(null);

    const res = await PUT(put({ checkId: "keyboard", status: "passed" }), { params });

    expect(res.status).toBe(404);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("records an audit entry naming the check and revision", async () => {
    await PUT(put({ checkId: "keyboard", status: "failed" }), { params });

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "manual_review.recorded",
        resourceId: "scan-1",
        metadata: { checkId: "keyboard", status: "failed", revision: 1 },
      })
    );
  });
});
