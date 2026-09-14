import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  roleHasPermissionMock,
  polarConfiguredMock,
  directPlanSelectEnabledMock,
  getWorkspaceMock,
  updateWorkspaceMock,
  auditMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  roleHasPermissionMock: vi.fn(),
  polarConfiguredMock: vi.fn(),
  directPlanSelectEnabledMock: vi.fn(),
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

vi.mock("@/lib/config", () => ({
  directPlanSelectEnabled: directPlanSelectEnabledMock,
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
  // Default to a local/demo build; production cases opt in explicitly.
  directPlanSelectEnabledMock.mockReset().mockReturnValue(true);
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

  it("refuses a paid tier when billing is unconfigured and direct select is off", async () => {
    // Production with no POLAR_ACCESS_TOKEN: the old code wrote the plan
    // straight through, handing out a free enterprise upgrade.
    polarConfiguredMock.mockReturnValue(false);
    directPlanSelectEnabledMock.mockReturnValue(false);

    const res = await POST(request("enterprise"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("billing_not_configured");
    expect(updateWorkspaceMock).not.toHaveBeenCalled();
  });

  it("still allows a free downgrade when billing is unconfigured", async () => {
    polarConfiguredMock.mockReturnValue(false);
    directPlanSelectEnabledMock.mockReturnValue(false);

    const res = await POST(request("free"));

    expect(res.status).toBe(200);
    expect(updateWorkspaceMock).toHaveBeenCalledWith("ws-1", { plan: "free" });
  });

  it("prefers the checkout error over the unconfigured error when Polar is set up", async () => {
    polarConfiguredMock.mockReturnValue(true);
    directPlanSelectEnabledMock.mockReturnValue(false);

    const res = await POST(request("starter"));

    expect((await res.json()).error).toBe("use_checkout");
    expect(updateWorkspaceMock).not.toHaveBeenCalled();
  });
});
