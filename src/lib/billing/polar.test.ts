import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  productIdForPlan,
  planForProductId,
  isEntitledStatus,
  polarConfigured,
  polarServer,
} from "./polar";

describe("polar config + product mapping", () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    process.env.POLAR_ACCESS_TOKEN = "polar_test";
    process.env.POLAR_SERVER = "sandbox";
    process.env.POLAR_PRODUCT_STARTER = "prod_starter";
    process.env.POLAR_PRODUCT_AGENCY = "prod_agency";
    process.env.POLAR_PRODUCT_TEAM = "prod_team";
    process.env.POLAR_PRODUCT_ENTERPRISE = "prod_ent";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("maps plan -> product id", () => {
    expect(productIdForPlan("starter")).toBe("prod_starter");
    expect(productIdForPlan("enterprise")).toBe("prod_ent");
  });

  it("reverse maps product id -> plan", () => {
    expect(planForProductId("prod_agency")).toBe("agency");
    expect(planForProductId("prod_team")).toBe("team");
  });

  it("returns null for an unknown or missing product", () => {
    expect(planForProductId("prod_unknown")).toBeNull();
    expect(planForProductId(null)).toBeNull();
    expect(planForProductId(undefined)).toBeNull();
  });

  it("only active/trialing are entitled", () => {
    expect(isEntitledStatus("active")).toBe(true);
    expect(isEntitledStatus("trialing")).toBe(true);
    expect(isEntitledStatus("canceled")).toBe(false);
    expect(isEntitledStatus("past_due")).toBe(false);
    expect(isEntitledStatus("unpaid")).toBe(false);
  });

  it("polarConfigured reflects the access token", () => {
    expect(polarConfigured()).toBe(true);
    delete process.env.POLAR_ACCESS_TOKEN;
    expect(polarConfigured()).toBe(false);
  });

  it("server defaults to sandbox unless explicitly production", () => {
    process.env.POLAR_SERVER = "production";
    expect(polarServer()).toBe("production");
    process.env.POLAR_SERVER = "sandbox";
    expect(polarServer()).toBe("sandbox");
    delete process.env.POLAR_SERVER;
    expect(polarServer()).toBe("sandbox");
  });
});
