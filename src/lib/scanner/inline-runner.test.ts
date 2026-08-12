/**
 * Regression guard for the static scan processor gate:
 *
 *   V1 always uses the static HTML scanner. It is fetch-only and no-screenshot,
 *   so persisted metadata and the results page make that limitation visible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const firestore = vi.hoisted(() => ({
  claimScanJob: vi.fn(),
  findScanJob: vi.fn(),
  updateScanJob: vi.fn(),
}));
const persistence = vi.hoisted(() => ({
  completeScanJob: vi.fn(),
  markScanFailed: vi.fn(),
  persistScanOutcome: vi.fn(),
}));
const scanner = vi.hoisted(() => ({
  runStaticScanJob: vi.fn(),
}));

// Stub the heavy module graph so importing the runner doesn't try to open
// Firebase Admin or pull in Playwright. The gate under test is pure.
vi.mock("@/lib/data/firestore", () => firestore);
vi.mock("./persistence", () => persistence);
vi.mock("./static-runner", () => scanner);
vi.mock("./playwright-runner", () => ({ runScanJob: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

import {
  inlineScanFallbackAllowedForQueueError,
  inlineScanFallbackEnabled,
  processScanInline,
} from "./inline-runner";

const ORIGINAL_ENV = { ...process.env };
const at = new Date("2026-07-28T12:00:00.000Z");

function queuedScan() {
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    requestedBy: "user-1",
    status: "queued",
    baseUrl: "https://example.com",
    sourceUrlsJson: null,
    maxPages: 1,
    scanType: "single",
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    permissionConfirmed: true,
    errorMessage: null,
    startedAt: null,
    createdAt: at,
    updatedAt: at,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.INLINE_SCAN_FALLBACK_ENABLED;
  firestore.findScanJob.mockResolvedValue(queuedScan());
  firestore.claimScanJob.mockResolvedValue({
    ...queuedScan(),
    status: "running",
    claimedBy: "inline-worker",
  });
  scanner.runStaticScanJob.mockResolvedValue({
    pages: [],
    pagesDiscovered: 1,
    pagesScanned: 1,
    durationMs: 100,
  });
  persistence.persistScanOutcome.mockResolvedValue(true);
  persistence.completeScanJob.mockResolvedValue(true);
  persistence.markScanFailed.mockResolvedValue(true);
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

describe("inline scan ownership", () => {
  it("atomically claims a queued scan and propagates the same worker id", async () => {
    await processScanInline("scan-1");

    expect(firestore.claimScanJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.stringMatching(/^inline-/)
    );
    const workerId = firestore.claimScanJob.mock.calls[0][2];
    expect(persistence.persistScanOutcome).toHaveBeenCalledWith(
      "scan-1",
      [],
      expect.objectContaining({ workspaceId: "ws-1", workerId })
    );
    expect(persistence.completeScanJob).toHaveBeenCalledWith(
      "scan-1",
      expect.any(Object),
      expect.objectContaining({ workspaceId: "ws-1", workerId })
    );
  });

  it("does not scan or persist when another worker wins the claim", async () => {
    firestore.claimScanJob.mockResolvedValue(null);

    await processScanInline("scan-1");

    expect(scanner.runStaticScanJob).not.toHaveBeenCalled();
    expect(persistence.persistScanOutcome).not.toHaveBeenCalled();
    expect(persistence.completeScanJob).not.toHaveBeenCalled();
  });
});
