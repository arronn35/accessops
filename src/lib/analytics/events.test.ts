import { describe, expect, it } from "vitest";
import { ClientAnalyticsEventSchema } from "./events";

describe("client analytics event contract", () => {
  it("accepts allow-listed events without content data", () => {
    expect(ClientAnalyticsEventSchema.safeParse({
      event: "page_viewed",
      properties: { page: "sample_report" },
    }).success).toBe(true);
  });

  it("rejects URL and arbitrary property leakage", () => {
    expect(ClientAnalyticsEventSchema.safeParse({
      event: "page_viewed",
      properties: { page: "landing", url: "https://customer.example" },
    }).success).toBe(false);
  });
});
