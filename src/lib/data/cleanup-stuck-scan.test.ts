import { describe, expect, it } from "vitest";
import {
  clampUsageDecrement,
  cleanupDayKey,
  cleanupMonthKey,
  parseCleanupArgs,
  scanHostMatches,
} from "./cleanup-stuck-scan-utils";

describe("cleanup-stuck-scan internals", () => {
  it("defaults to dry-run unless an explicit confirm scan id is provided", () => {
    expect(
      parseCleanupArgs(["--email", "EFEG6567@gmail.com", "--host", "higgsfield.ai"])
    ).toMatchObject({
      email: "efeg6567@gmail.com",
      host: "higgsfield.ai",
      dryRun: true,
      confirmScanId: null,
    });

    expect(
      parseCleanupArgs([
        "--email",
        "efeg6567@gmail.com",
        "--host",
        "higgsfield.ai",
        "--confirm",
        "scan-1",
      ])
    ).toMatchObject({
      dryRun: false,
      confirmScanId: "scan-1",
    });
  });

  it("matches exact hosts and subdomains but not lookalike domains", () => {
    expect(scanHostMatches("https://higgsfield.ai/dashboard", "higgsfield.ai")).toBe(true);
    expect(scanHostMatches("https://www.higgsfield.ai/", "higgsfield.ai")).toBe(true);
    expect(scanHostMatches("https://higgsfield.ai.evil.test/", "higgsfield.ai")).toBe(false);
  });

  it("clamps usage rollback values at zero", () => {
    expect(clampUsageDecrement(4, 1)).toBe(3);
    expect(clampUsageDecrement(1, 4)).toBe(0);
    expect(clampUsageDecrement(undefined, 1)).toBe(0);
  });

  it("formats day and month keys in UTC", () => {
    const date = new Date("2026-06-09T22:30:00.000Z");
    expect(cleanupDayKey(date)).toBe("2026-06-09");
    expect(cleanupMonthKey(date)).toBe("2026-06");
  });
});
