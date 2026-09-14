import { beforeEach, describe, expect, it, vi } from "vitest";
const authorize = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/internal-auth", () => ({ authorizeInternalRequest: authorize }));
vi.mock("@/lib/release/manifest", () => ({ releaseManifest: () => ({ commit: "abc", scannerVersion: "v1" }) }));
import { GET } from "./route";
beforeEach(() => vi.clearAllMocks());
describe("release metadata endpoint", () => {
  it("denies unauthenticated access even in development", async () => {
    for (const auth of [{ ok: false }, { ok: true, via: "unauthenticated_dev" }]) {
      authorize.mockResolvedValue(auth);
      expect((await GET(new Request("https://example.com/api/internal/release"))).status).toBe(401);
    }
  });
  it("serves build metadata without caching for authorized callers", async () => {
    authorize.mockResolvedValue({ ok: true, via: "shared_secret" });
    const response = await GET(new Request("https://example.com/api/internal/release"));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ commit: "abc", scannerVersion: "v1" });
  });
});
