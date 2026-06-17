import { describe, it, expect } from "vitest";
import { SCAN_VIEWPORTS, type ScanViewportName } from "./types";

/**
 * Phase 5 regression: scans must cover desktop, tablet, and mobile so
 * results are stored separately per viewport. A dropped or renamed
 * viewport would silently shrink responsive coverage.
 */
describe("SCAN_VIEWPORTS", () => {
  it("covers desktop, tablet, and mobile", () => {
    const names = SCAN_VIEWPORTS.map((v) => v.name).sort();
    expect(names).toEqual(["desktop", "mobile", "tablet"]);
  });

  it("uses the standard tablet dimensions (768x1024)", () => {
    const tablet = SCAN_VIEWPORTS.find((v) => v.name === "tablet");
    expect(tablet).toEqual({ name: "tablet", width: 768, height: 1024 });
  });

  it("has unique, positive dimensions for every viewport", () => {
    const seen = new Set<ScanViewportName>();
    for (const v of SCAN_VIEWPORTS) {
      expect(v.width).toBeGreaterThan(0);
      expect(v.height).toBeGreaterThan(0);
      expect(seen.has(v.name)).toBe(false);
      seen.add(v.name);
    }
  });
});
