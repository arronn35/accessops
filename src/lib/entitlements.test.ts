import { afterEach, describe, expect, it } from "vitest";
import {
  bootstrapEntitlementForEmail,
  isAdminEmail,
  scanCapsForPlan,
} from "./entitlements";

const originalAdminEmails = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = originalAdminEmails;
});

describe("admin tester entitlements", () => {
  it("matches admin emails case-insensitively from ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = " efeg6567@gmail.com,second@example.com ";

    expect(isAdminEmail("EFEG6567@gmail.com")).toBe(true);
    expect(isAdminEmail("other@example.com")).toBe(false);
  });

  it("assigns enterprise owner entitlement to admin testers", () => {
    process.env.ADMIN_EMAILS = "efeg6567@gmail.com";

    expect(bootstrapEntitlementForEmail("efeg6567@gmail.com")).toEqual({
      plan: "enterprise",
      role: "owner",
    });
    expect(bootstrapEntitlementForEmail("user@example.com")).toEqual({
      plan: "free",
      role: "owner",
    });
  });

  it("keeps free caps low and enterprise caps high", () => {
    expect(scanCapsForPlan("free")).toEqual({
      dailyScanCap: 3,
      maxPagesCap: 3,
    });
    expect(scanCapsForPlan("enterprise")).toEqual({
      dailyScanCap: 1000,
      maxPagesCap: 1000,
    });
  });
});
