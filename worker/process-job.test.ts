import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/scanner", () => ({
  runScanJob: vi.fn(),
  resolveScanTargets: vi.fn(),
}));

vi.mock("@/lib/scanner/static-runner", () => ({
  runStaticScanJob: vi.fn(),
}));

vi.mock("@/lib/scanner/persistence", () => ({
  completeScanJob: vi.fn(),
  markScanFailed: vi.fn(),
  persistScanOutcome: vi.fn(),
}));

vi.mock("@/lib/data/firestore", () => ({
  createPageJobs: vi.fn(),
  updateScanJob: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  captureException: vi.fn(),
}));

import {
  processScanJob,
  scanInputForJob,
  WORKER_SCAN_HARD_TIMEOUT_MS,
  type ProcessJobDeps,
} from "./process-job";
import type { ScanJob } from "@/lib/data/types";
import type { NormalizedPage, ScanOutcome } from "@/lib/scanner/types";

function makeJob(overrides: Partial<ScanJob> = {}): ScanJob {
  const nowDate = new Date();
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    projectId: null,
    requestedBy: "user-1",
    scanType: "single",
    status: "running",
    baseUrl: "https://example.com",
    sourceUrlsJson: null,
    maxPages: 3,
    pagesDiscovered: 0,
    pagesScanned: 0,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "crawling",
    claimedBy: "worker-1",
    startedAt: nowDate,
    completedAt: null,
    errorMessage: null,
    createdAt: nowDate,
    updatedAt: nowDate,
    ...overrides,
  };
}

function page(engine: string): NormalizedPage {
  return {
    url: "https://example.com/",
    title: "Example",
    statusCode: 200,
    scannedAt: new Date(),
    rawMetadata: { engine, resultConfidence: engine === "playwright-axe" ? "high" : "low" },
    issues: [],
  };
}

function outcome(engine: string): ScanOutcome {
  return { pages: [page(engine)], pagesDiscovered: 1, pagesScanned: 1, durationMs: 1000 };
}

function deps(overrides: Partial<ProcessJobDeps> = {}): ProcessJobDeps {
  return {
    runScanJob: vi.fn(async () => outcome("playwright-axe")),
    runStaticScanJob: vi.fn(async () => outcome("static-html-fallback")),
    persistScanOutcome: vi.fn(async () => true),
    completeScanJob: vi.fn(async () => true),
    markScanFailed: vi.fn(async () => true),
    updateScanJob: vi.fn(async () => undefined),
    resolveScanTargets: vi.fn(async () => ["https://example.com/"]),
    createPageJobs: vi.fn(async () => 1),
    ...overrides,
  };
}

describe("scanInputForJob", () => {
  it("maps a job row to scanner input with a generous worker deadline", () => {
    const input = scanInputForJob(
      makeJob({ scanType: "multi", maxPages: 10, storeScreenshots: true, visualEvidenceMaxScreenshots: 5 })
    );
    expect(input).toMatchObject({
      jobId: "scan-1",
      url: "https://example.com",
      scanType: "multi",
      maxPages: 10,
      storeScreenshots: true,
      visualEvidenceEnabled: true,
      visualEvidenceMaxScreenshots: 5,
    });
    expect(input.timeoutMs).toBeGreaterThanOrEqual(30_000);
  });
});

describe("processScanJob", () => {
  it("resolves targets and creates page jobs without running the monolithic scanner", async () => {
    const d = deps();
    await processScanJob(makeJob({ usePageJobs: true }), d);

    expect(d.resolveScanTargets).toHaveBeenCalledOnce();
    expect(d.createPageJobs).toHaveBeenCalledWith("ws-1", "scan-1", [
      "https://example.com/",
    ]);
    expect(d.runScanJob).not.toHaveBeenCalled();
    expect(d.persistScanOutcome).not.toHaveBeenCalled();
  });

  it("runs the real engine and persists + completes on success", async () => {
    const d = deps();
    await processScanJob(makeJob(), d);

    expect(d.runScanJob).toHaveBeenCalledOnce();
    expect(d.runStaticScanJob).not.toHaveBeenCalled();
    expect(d.persistScanOutcome).toHaveBeenCalledWith(
      "scan-1",
      expect.any(Array),
      expect.objectContaining({ workspaceId: "ws-1", storeScreenshots: false })
    );
    expect(d.completeScanJob).toHaveBeenCalledOnce();
    expect(d.markScanFailed).not.toHaveBeenCalled();
  });

  it("falls back to the static scan when the browser cannot launch", async () => {
    const launchError = Object.assign(new Error("Browser launch failed: no chromium"), {
      code: "browser_launch_failed",
    });
    const d = deps({ runScanJob: vi.fn(async () => { throw launchError; }) });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).toHaveBeenCalledOnce();
    expect(d.completeScanJob).toHaveBeenCalledOnce();
    expect(d.markScanFailed).not.toHaveBeenCalled();
    // The job is annotated so users see why results are static.
    expect(d.updateScanJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({ processorError: "browser_launch_failed" })
    );
    expect(d.persistScanOutcome).toHaveBeenCalledWith(
      "scan-1",
      [
        expect.objectContaining({
          rawMetadata: expect.objectContaining({
            fallbackMode: true,
            resultConfidence: "low",
            code: "browser_launch_failed",
          }),
        }),
      ],
      expect.any(Object)
    );
  });

  it.each([
    ["navigation_failed", "Navigation failed: net::ERR_CONNECTION_RESET"],
    ["axe_failed", "axe timeout"],
    ["deadline_exceeded", "Scan deadline exceeded"],
  ])("uses static fallback for %s", async (code, message) => {
    const error = Object.assign(new Error(message), { code });
    const d = deps({
      runScanJob: vi.fn(async () => {
        throw error;
      }),
    });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).toHaveBeenCalledOnce();
    expect(d.completeScanJob).toHaveBeenCalledOnce();
    expect(d.markScanFailed).not.toHaveBeenCalled();
  });

  it("uses static fallback when the legacy crawler returns only failed page metadata", async () => {
    const failedOutcome: ScanOutcome = {
      pages: [
        {
          ...page("playwright-axe"),
          statusCode: null,
          rawMetadata: {
            engine: "playwright-axe",
            fallbackMode: false,
            resultConfidence: "low",
            code: "navigation_failed",
            message: "Navigation failed: net::ERR_CONNECTION_REFUSED",
          },
        },
      ],
      pagesDiscovered: 1,
      pagesScanned: 1,
      durationMs: 500,
    };
    const d = deps({
      runScanJob: vi.fn(async () => failedOutcome),
    });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).toHaveBeenCalledOnce();
    expect(d.completeScanJob).toHaveBeenCalledOnce();
  });

  it("fails the job (no fallback) on an unclassified scan error", async () => {
    const d = deps({ runScanJob: vi.fn(async () => { throw new Error("kaboom"); }) });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).not.toHaveBeenCalled();
    expect(d.completeScanJob).not.toHaveBeenCalled();
    expect(d.markScanFailed).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "kaboom",
      "worker-1"
    );
  });

  it("never falls back when a redirect is rejected by the SSRF guard", async () => {
    const error = Object.assign(
      new Error(
        "Redirect rejected by SSRF guard: URL validation failed: private_ip"
      ),
      { code: "navigation_failed" }
    );
    const d = deps({
      runScanJob: vi.fn(async () => {
        throw error;
      }),
    });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).not.toHaveBeenCalled();
    expect(d.markScanFailed).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      error.message,
      "worker-1"
    );
  });

  it("never falls back on URL validation failures", async () => {
    const error = Object.assign(
      new Error("URL validation failed: private_ip (127.0.0.1)"),
      { code: "private_ip" }
    );
    const d = deps({
      runScanJob: vi.fn(async () => {
        throw error;
      }),
    });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).not.toHaveBeenCalled();
    expect(d.markScanFailed).toHaveBeenCalledOnce();
  });

  it("uses static fallback when the browser engine hangs past the hard deadline", async () => {
    vi.useFakeTimers();
    try {
      // A scan that never resolves (e.g. a hung Playwright call) must not pin
      // the worker slot forever — the hard wall-clock ceiling fails it instead.
      const d = deps({
        runScanJob: vi.fn(() => new Promise<ScanOutcome>(() => {})),
      });

      const finished = processScanJob(makeJob(), d);
      await vi.advanceTimersByTimeAsync(WORKER_SCAN_HARD_TIMEOUT_MS + 1_000);
      await finished;

      expect(d.runStaticScanJob).toHaveBeenCalledOnce();
      expect(d.completeScanJob).toHaveBeenCalledOnce();
      expect(d.markScanFailed).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails fast when permission was not confirmed", async () => {
    const d = deps();
    await processScanJob(makeJob({ permissionConfirmed: false }), d);

    expect(d.runScanJob).not.toHaveBeenCalled();
    expect(d.markScanFailed).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "permission_not_confirmed",
      "worker-1"
    );
  });

  it("does not write post-terminal fields after losing the completion race", async () => {
    const d = deps({
      completeScanJob: vi.fn(async () => false),
    });

    await processScanJob(makeJob(), d);

    expect(d.completeScanJob).toHaveBeenCalledOnce();
    expect(d.updateScanJob).not.toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({ currentStep: "completed" })
    );
    expect(d.markScanFailed).not.toHaveBeenCalled();
  });
});
