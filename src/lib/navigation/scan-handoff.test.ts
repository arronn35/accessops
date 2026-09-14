import { describe, expect, it } from "vitest";
import { newScanPath, safePublicScanUrl, scanSetupPath } from "./scan-handoff";

describe("scan handoff", () => {
  it("keeps a public http(s) URL and strips credentials and fragments", () => {
    expect(safePublicScanUrl("https://user:pass@example.com/path#section")).toBe(
      "https://example.com/path"
    );
  });

  it("rejects non-web and malformed values", () => {
    expect(safePublicScanUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicScanUrl("not a url")).toBeNull();
  });

  it("builds encoded setup and scan paths", () => {
    const url = "https://example.com/a?b=c";
    expect(scanSetupPath(url)).toBe(`/workspace/setup?url=${encodeURIComponent(url)}`);
    expect(newScanPath(url)).toBe(`/app/scans/new?url=${encodeURIComponent(url)}`);
  });
});
