import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  roleHasPermissionMock,
  polarConfiguredMock,
  getWorkspaceMock,
  updateWorkspaceMock,
  auditMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  roleHasPermissionMock: vi.fn(),
  polarConfiguredMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  updateWorkspaceMock: vi.fn(),
  auditMock: vi.fn(),
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
  getWorkspace: getWorkspaceMock,
  updateWorkspace: updateWorkspaceMock,
}));

vi.mock("@/lib/entitlements", () => ({
  roleHasPermission: roleHasPermissionMock,
}));

vi.mock("@/lib/billing/polar", () => ({
  polarConfigured: polarConfiguredMock,
}));

import { POST } from "./route";

function request(plan: string): Request {
  return new Request("http://localhost/api/plan/select", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan }),
  });
}

beforeEach(() => {
  requireSessionMock.mockReset().mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-1",
    role: "owner",
  });
  roleHasPermissionMock.mockReset().mockReturnValue(true);
  polarConfiguredMock.mockReset().mockReturnValue(true);
  getWorkspaceMock.mockReset().mockResolvedValue({ id: "ws-1", plan: "free" });
  updateWorkspaceMock.mockReset().mockResolvedValue(undefined);
  auditMock.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/plan/select", () => {
  it("blocks direct paid-plan selection when Polar billing is configured", async () => {
    const res = await POST(request("starter"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("use_checkout");
    expect(updateWorkspaceMock).not.toHaveBeenCalled();
  });

  it("blocks direct free downgrade while a Polar subscription exists", async () => {
    getWorkspaceMock.mockResolvedValue({
      id: "ws-1",
      plan: "starter",
      polarCustomerId: "cus_1",
      polarSubscriptionId: "sub_1",
    });

    const res = await POST(request("free"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("use_customer_portal");
    expect(updateWorkspaceMock).not.toHaveBeenCalled();
  });

  it("keeps local/demo direct selection when Polar billing is disabled", async () => {
    polarConfiguredMock.mockReturnValue(false);

    const res = await POST(request("starter"));

    expect(res.status).toBe(200);
    expect(updateWorkspaceMock).toHaveBeenCalledWith("ws-1", { plan: "starter" });
  });
});
