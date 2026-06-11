/**
 * Regression guard for the static scan processor gate:
 *
 *   V1 always uses the static HTML scanner. It is fetch-only and no-screenshot,
 *   so persisted metadata and the results page make that limitation visible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub the heavy module graph so importing the runner doesn't try to open
// Firebase Admin or pull in Playwright. The gate under test is pure.
vi.mock("@/lib/data/firestore", () => ({
  findScanJob: vi.fn(),
  updateScanJob: vi.fn(),
}));
vi.mock("./persistence", () => ({
  completeScanJob: vi.fn(),
  markScanFailed: vi.fn(),
  persistScanOutcome: vi.fn(),
}));
vi.mock("./static-runner", () => ({ runStaticScanJob: vi.fn() }));
vi.mock("./playwright-runner", () => ({ runScanJob: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

import {
  inlineScanFallbackAllowedForQueueError,
  inlineScanFallbackEnabled,
} from "./inline-runner";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.INLINE_SCAN_FALLBACK_ENABLED;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("inlineScanFallbackEnabled", () => {
  it("is enabled by default because static scan is the V1 primary engine", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(inlineScanFallbackEnabled()).toBe(true);
  });

  it("is enabled in production without legacy feature flags", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(inlineScanFallbackEnabled()).toBe(true);
  });

  it("allows static fallback for queue transport exhaustion", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = new Error("ERR max requests limit exceeded. Limit: 500000, Usage: 500004.");
    expect(inlineScanFallbackAllowedForQueueError(err)).toBe(true);
  });
});
