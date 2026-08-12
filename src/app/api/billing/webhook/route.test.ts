/**
 * Tests for the Polar webhook receiver — the only writer of a paid plan.
 * We mock signature validation (so we can feed crafted events) and the data
 * layer, and assert the entitlement mapping: active+mapped -> tier,
 * canceled -> free, unmapped product -> status only, bad signature -> 403.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { validateEventMock, updateBillingMock, findByCustomerMock, captureMock } =
  vi.hoisted(() => ({
    validateEventMock: vi.fn(),
    updateBillingMock: vi.fn(),
    findByCustomerMock: vi.fn(),
    captureMock: vi.fn(),
  }));

vi.mock("@polar-sh/sdk/webhooks", () => {
  // Defined inside the factory: vi.mock is hoisted above top-level code, so a
  // top-level class would not be initialized yet when the factory runs.
  class WebhookVerificationError extends Error {}
  return { validateEvent: validateEventMock, WebhookVerificationError };
});

vi.mock("@/lib/data/firestore", () => ({
  updateWorkspaceBilling: updateBillingMock,
  findWorkspaceByPolarCustomerId: findByCustomerMock,
}));

vi.mock("@/lib/observability", () => ({ captureException: captureMock }));

import { POST } from "./route";

function req(): Request {
  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: { "webhook-signature": "v1,sig" },
    body: "{}",
  });
}

function subEvent(
  type: string,
  data: Record<string, unknown>
): { type: string; data: Record<string, unknown> } {
  return { type, data };
}

beforeEach(() => {
  validateEventMock.mockReset();
  updateBillingMock.mockReset().mockResolvedValue(undefined);
  findByCustomerMock.mockReset().mockResolvedValue(null);
  captureMock.mockReset();
  process.env.POLAR_WEBHOOK_SECRET = "whsec_test";
  process.env.POLAR_PRODUCT_AGENCY = "prod_agency";
  process.env.POLAR_PRODUCT_STARTER = "prod_starter";
});

describe("POST /api/billing/webhook", () => {
  it("returns 403 on an invalid signature and writes nothing", async () => {
    const { WebhookVerificationError } = await import("@polar-sh/sdk/webhooks");
    validateEventMock.mockImplementation(() => {
      throw new WebhookVerificationError("bad sig");
    });
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(updateBillingMock).not.toHaveBeenCalled();
  });

  it("maps an active subscription to its plan tier", async () => {
    validateEventMock.mockReturnValue(
      subEvent("subscription.active", {
        id: "sub_1",
        status: "active",
        productId: "prod_agency",
        customerId: "cus_1",
        customer: { externalId: "ws-1" },
        currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
        metadata: {},
      })
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(updateBillingMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({
        plan: "agency",
        polarCustomerId: "cus_1",
        polarSubscriptionId: "sub_1",
        subscriptionStatus: "active",
      })
    );
  });

  it("downgrades to free when the subscription is canceled", async () => {
    validateEventMock.mockReturnValue(
      subEvent("subscription.canceled", {
        id: "sub_1",
        status: "canceled",
        productId: "prod_agency",
        customerId: "cus_1",
        customer: { externalId: "ws-1" },
        currentPeriodEnd: null,
        metadata: {},
      })
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(updateBillingMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ plan: "free", subscriptionStatus: "canceled" })
    );
  });

  it("records status but does NOT set a plan for an unmapped product", async () => {
    validateEventMock.mockReturnValue(
      subEvent("subscription.active", {
        id: "sub_2",
        status: "active",
        productId: "prod_unknown",
        customerId: "cus_2",
        customer: { externalId: "ws-2" },
        currentPeriodEnd: null,
        metadata: {},
      })
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    const arg = updateBillingMock.mock.calls[0][1];
    expect(arg).not.toHaveProperty("plan");
    expect(arg.subscriptionStatus).toBe("active");
  });

  it("falls back to metadata.workspaceId when externalId is absent", async () => {
    validateEventMock.mockReturnValue(
      subEvent("subscription.active", {
        id: "sub_3",
        status: "active",
        productId: "prod_starter",
        customerId: "cus_3",
        customer: { externalId: null },
        currentPeriodEnd: null,
        metadata: { workspaceId: "ws-3" },
      })
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(updateBillingMock).toHaveBeenCalledWith(
      "ws-3",
      expect.objectContaining({ plan: "starter" })
    );
  });

  it("acknowledges (200) but writes nothing when no workspace can be resolved", async () => {
    validateEventMock.mockReturnValue(
      subEvent("subscription.active", {
        id: "sub_4",
        status: "active",
        productId: "prod_starter",
        customerId: "cus_4",
        customer: { externalId: null },
        currentPeriodEnd: null,
        metadata: {},
      })
    );
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(updateBillingMock).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types", async () => {
    validateEventMock.mockReturnValue(subEvent("order.paid", { id: "ord_1" }));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(updateBillingMock).not.toHaveBeenCalled();
  });
});
