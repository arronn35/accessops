import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/scanner", () => ({
  runScanJob: vi.fn(),
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
  updateScanJob: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  captureException: vi.fn(),
}));

import { processScanJob, scanInputForJob, type ProcessJobDeps } from "./process-job";
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
    persistScanOutcome: vi.fn(async () => undefined),
    completeScanJob: vi.fn(async () => undefined),
    markScanFailed: vi.fn(async () => undefined),
    updateScanJob: vi.fn(async () => undefined),
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
  });

  it("fails the job (no fallback) on a non-launch scan error", async () => {
    const d = deps({ runScanJob: vi.fn(async () => { throw new Error("kaboom"); }) });

    await processScanJob(makeJob(), d);

    expect(d.runStaticScanJob).not.toHaveBeenCalled();
    expect(d.completeScanJob).not.toHaveBeenCalled();
    expect(d.markScanFailed).toHaveBeenCalledWith("ws-1", "scan-1", "kaboom");
  });

  it("fails fast when permission was not confirmed", async () => {
    const d = deps();
    await processScanJob(makeJob({ permissionConfirmed: false }), d);

    expect(d.runScanJob).not.toHaveBeenCalled();
    expect(d.markScanFailed).toHaveBeenCalledWith("ws-1", "scan-1", "permission_not_confirmed");
  });
});
