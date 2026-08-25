import { afterEach, describe, expect, it, vi } from "vitest";
import { publicCheckEnabled } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicCheckEnabled", () => {
  it("is available by default outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PUBLIC_CHECK_ENABLED", "");

    expect(publicCheckEnabled()).toBe(true);
  });

  it("requires an explicit production opt-in", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_CHECK_ENABLED", "");
    expect(publicCheckEnabled()).toBe(false);

    vi.stubEnv("PUBLIC_CHECK_ENABLED", "true");
    expect(publicCheckEnabled()).toBe(true);
  });
});
