import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  requirePermissionMock,
  getUserMock,
  getWorkspaceMock,
  polarConfiguredMock,
  polarClientMock,
  productIdForPlanMock,
  checkoutCreateMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  getUserMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  polarConfiguredMock: vi.fn(),
  polarClientMock: vi.fn(),
  productIdForPlanMock: vi.fn(),
  checkoutCreateMock: vi.fn(),
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
  getUser: getUserMock,
  getWorkspace: getWorkspaceMock,
}));

vi.mock("@/lib/billing/polar", () => ({
  polarConfigured: polarConfiguredMock,
  polarClient: polarClientMock,
  productIdForPlan: productIdForPlanMock,
}));

import { POST } from "./route";

const ORIGINAL_BILLING_TEST_EMAILS = process.env.BILLING_TEST_EMAILS;

function request(plan: string): Request {
  return new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan }),
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://percevia.example/";
  if (ORIGINAL_BILLING_TEST_EMAILS === undefined) delete process.env.BILLING_TEST_EMAILS;
  else process.env.BILLING_TEST_EMAILS = ORIGINAL_BILLING_TEST_EMAILS;
  requirePermissionMock.mockReset().mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-1",
    role: "owner",
  });
  getUserMock.mockReset().mockResolvedValue({
    id: "user-1",
    email: "customer@example.com",
  });
  getWorkspaceMock.mockReset().mockResolvedValue({ id: "ws-1", plan: "free" });
  polarConfiguredMock.mockReset().mockReturnValue(true);
  productIdForPlanMock.mockReset().mockImplementation((plan: string) => `prod_${plan}`);
  checkoutCreateMock.mockReset().mockResolvedValue({ url: "https://checkout.polar.sh/session" });
  polarClientMock.mockReset().mockReturnValue({
    checkouts: { create: checkoutCreateMock },
  });
});

afterEach(() => {
  if (ORIGINAL_BILLING_TEST_EMAILS === undefined) delete process.env.BILLING_TEST_EMAILS;
  else process.env.BILLING_TEST_EMAILS = ORIGINAL_BILLING_TEST_EMAILS;
});

describe("POST /api/billing/checkout", () => {
  it("creates a Polar checkout for the selected workspace and plan", async () => {
    const res = await POST(request("agency"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      url: "https://checkout.polar.sh/session",
    });
    expect(checkoutCreateMock).toHaveBeenCalledWith({
      products: ["prod_agency"],
      currency: "eur",
      prices: undefined,
      externalCustomerId: "ws-1",
      metadata: { workspaceId: "ws-1", plan: "agency", billingTest: false },
      successUrl: "https://percevia.example/app/settings/billing?checkout=success",
    });
  });

  it("sets a free Polar price override only for billing test accounts", async () => {
    process.env.BILLING_TEST_EMAILS = " efeg6567@gmail.com ";
    getUserMock.mockResolvedValue({
      id: "user-1",
      email: "EFEG6567@gmail.com",
    });

    const res = await POST(request("team"));

    expect(res.status).toBe(200);
    expect(checkoutCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        products: ["prod_team"],
        currency: "eur",
        prices: {
          prod_team: [
            { amountType: "free", priceCurrency: "usd" },
            { amountType: "free", priceCurrency: "eur" },
          ],
        },
        metadata: { workspaceId: "ws-1", plan: "team", billingTest: true },
      })
    );
  });

  it("does not create checkout when billing is disabled", async () => {
    polarConfiguredMock.mockReturnValue(false);

    const res = await POST(request("starter"));

    expect(res.status).toBe(503);
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  it("rejects paid plans with no configured Polar product", async () => {
    productIdForPlanMock.mockReturnValue(null);

    const res = await POST(request("enterprise"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("plan_not_purchasable");
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });
});
