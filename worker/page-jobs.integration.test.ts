import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));
vi.mock("./log", () => ({ logScanEvent: vi.fn() }));
vi.mock("@/lib/scanner/playwright-runner", () => ({
  launchBrowser: vi.fn(),
  scanSinglePage: vi.fn(),
  createDeadline: vi.fn(() => ({ deadlineAt: Date.now() + 60_000 })),
}));
vi.mock("@/lib/scanner/static-runner", () => ({ runStaticScanJob: vi.fn() }));
vi.mock("@/lib/scanner/visual-evidence", () => ({
  createEvidenceBudget: vi.fn(),
}));
vi.mock("@/lib/scanner/persistence", () => ({
  aggregateScan: vi.fn(),
  persistPageResult: vi.fn(),
}));
vi.mock("@/lib/data/firestore", () => ({
  completePageJob: vi.fn(),
  failPageJob: vi.fn(),
  renewOwnedScanClaim: vi.fn(),
  touchPageJob: vi.fn(),
  updateScanJob: vi.fn(),
}));

import { planPageFinalize, terminalScanPhase } from "@/lib/data/page-jobs";
import { calculateScanScore } from "@/lib/scanner/scoring";
import type { PageJob, ScanJob, ScanPhase } from "@/lib/data/types";
import type { NormalizedPage } from "@/lib/scanner/types";
import { processPageJob, type ProcessPageJobDeps } from "./process-page-job";

function scan(): ScanJob {
  const at = new Date();
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    requestedBy: "user-1",
    scanType: "manual",
    status: "running",
    baseUrl: "https://example.com",
    sourceUrlsJson: null,
    maxPages: 5,
    pagesDiscovered: 5,
    pagesScanned: 0,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "scanning",
    startedAt: at,
    completedAt: null,
    errorMessage: null,
    usePageJobs: true,
    phase: "scanning",
    pagesDone: 0,
    pagesFailed: 0,
    pagesTotal: 5,
    createdAt: at,
    updatedAt: at,
  };
}

function pageJob(index: number, attempts = 1): PageJob {
  return {
    id: `page-${index}`,
    scanJobId: "scan-1",
    workspaceId: "ws-1",
    url: `https://example.com/page-${index}`,
    status: "running",
    attempts,
    maxAttempts: 2,
    claimedBy: "worker-1",
    heartbeatAt: new Date(),
    deadlineMs: 60_000,
    createdAt: new Date(),
  };
}

function normalized(job: PageJob): NormalizedPage {
  return {
    url: job.url,
    title: job.id,
    statusCode: 200,
    scannedAt: new Date(),
    rawMetadata: { engine: "playwright-axe" },
    issues: [],
  };
}

describe("per-page scan integration", () => {
  it("completes with errors when page 3 times out twice and scores the other four pages", async () => {
    const parent = scan();
    const storedPages = new Map<string, NormalizedPage>();
    const failedJobs = new Map<string, PageJob>();
    let pagesDone = 0;
    let pagesFailed = 0;
    let phase: ScanPhase = "scanning";
    let aggregateCalls = 0;
    let scorePageCount = 0;

    const finalize = (kind: "done" | "failed") => {
      const plan = planPageFinalize(
        { pagesTotal: 5, pagesDone, pagesFailed, phase },
        kind
      );
      pagesDone = plan.pagesDone;
      pagesFailed = plan.pagesFailed;
      phase = plan.nextPhase ?? phase;
      return plan.aggregationWon;
    };

    const deps: ProcessPageJobDeps = {
      runPageScan: vi.fn(async (job) => {
        if (job.id === "page-3") {
          throw Object.assign(new Error("Page scan failed unexpectedly."), {
            code: "page_scan_failed",
          });
        }
        return normalized(job);
      }),
      runStaticPageScan: vi.fn(async (job) => normalized(job)),
      persistPageResult: vi.fn(async (_scanId, page, options) => {
        storedPages.set(options.pageJobId, page);
      }),
      completePageJob: vi.fn(async () => ({ aggregationWon: finalize("done") })),
      failPageJob: vi.fn(async (_workspaceId, _scanId, id, error, errorCode) => {
        const current = id === "page-3" && failedJobs.has(id) ? 2 : 1;
        if (current < 2) {
          failedJobs.set(id, { ...pageJob(3, 2), status: "queued", error, errorCode });
          return { requeued: true, aggregationWon: false };
        }
        failedJobs.set(id, { ...pageJob(3, 2), status: "failed", error, errorCode });
        return { requeued: false, aggregationWon: finalize("failed") };
      }),
      renewOwnedScanClaim: vi.fn(async () => parent),
      touchPageJob: vi.fn(async () => true),
      updateScanJob: vi.fn(async () => undefined),
      aggregateScan: vi.fn(async () => {
        aggregateCalls += 1;
        const summary = calculateScanScore([...storedPages.values()]);
        if (!summary) throw new Error("expected_scorable_summary");
        scorePageCount = summary.pageScores.length;
        phase = terminalScanPhase(pagesDone, pagesFailed);
        return { phase, pagesDone, pagesFailed };
      }),
    };

    await processPageJob(pageJob(1), parent, deps);
    await processPageJob(pageJob(2), parent, deps);
    await processPageJob(pageJob(3), parent, deps);
    await processPageJob(pageJob(4), parent, deps);
    await processPageJob(pageJob(5), parent, deps);
    await processPageJob(pageJob(3, 2), parent, deps);

    expect(aggregateCalls).toBe(1);
    expect(phase).toBe("completed_with_errors");
    expect({ pagesDone, pagesFailed, scorePageCount }).toEqual({
      pagesDone: 4,
      pagesFailed: 1,
      scorePageCount: 4,
    });
    expect(failedJobs.get("page-3")).toMatchObject({
      url: "https://example.com/page-3",
      status: "failed",
      errorCode: "page_scan_failed",
    });
  });

  it.each([
    ["navigation_failed", "Navigation failed: net::ERR_CONNECTION_RESET"],
    ["axe_failed", "axe timeout"],
    ["page_deadline_exceeded", "Page scan exceeded its 60s deadline."],
  ])("completes a page with static fallback after %s", async (code, message) => {
    const job = pageJob(1);
    const browserError = Object.assign(new Error(message), { code });
    const staticPage: NormalizedPage = {
      ...normalized(job),
      rawMetadata: {
        engine: "static-html-fallback",
        fallbackMode: true,
        resultConfidence: "low" as const,
      },
    };
    const deps: ProcessPageJobDeps = {
      runPageScan: vi.fn(async () => {
        throw browserError;
      }),
      runStaticPageScan: vi.fn(async () => staticPage),
      persistPageResult: vi.fn(async () => undefined),
      completePageJob: vi.fn(async () => ({ aggregationWon: false })),
      failPageJob: vi.fn(async () => ({
        requeued: false,
        aggregationWon: false,
      })),
      renewOwnedScanClaim: vi.fn(async () => scan()),
      touchPageJob: vi.fn(async () => true),
      updateScanJob: vi.fn(async () => undefined),
      aggregateScan: vi.fn(),
    };

    await processPageJob(job, scan(), deps);

    expect(deps.runStaticPageScan).toHaveBeenCalledOnce();
    expect(deps.failPageJob).not.toHaveBeenCalled();
    expect(deps.persistPageResult).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({
        rawMetadata: expect.objectContaining({
          fallbackMode: true,
          resultConfidence: "low",
          code,
          message,
        }),
      }),
      expect.any(Object)
    );
  });

  it("does not use page fallback for an SSRF-rejected redirect", async () => {
    const job = pageJob(1);
    const error = Object.assign(
      new Error(
        "Redirect rejected by SSRF guard: URL validation failed: private_ip"
      ),
      { code: "navigation_failed" }
    );
    const deps: ProcessPageJobDeps = {
      runPageScan: vi.fn(async () => {
        throw error;
      }),
      runStaticPageScan: vi.fn(async () => normalized(job)),
      persistPageResult: vi.fn(async () => undefined),
      completePageJob: vi.fn(async () => ({ aggregationWon: false })),
      failPageJob: vi.fn(async () => ({
        requeued: false,
        aggregationWon: false,
      })),
      renewOwnedScanClaim: vi.fn(async () => scan()),
      touchPageJob: vi.fn(async () => true),
      updateScanJob: vi.fn(async () => undefined),
      aggregateScan: vi.fn(),
    };

    await processPageJob(job, scan(), deps);

    expect(deps.runStaticPageScan).not.toHaveBeenCalled();
    expect(deps.failPageJob).toHaveBeenCalledOnce();
  });

  it("keeps a failed static fallback diagnostic but fails the page job", async () => {
    const job = pageJob(1);
    const browserError = Object.assign(new Error("Navigation timed out"), {
      code: "navigation_failed",
    });
    const failedStaticPage: NormalizedPage = {
      ...normalized(job),
      title: null,
      statusCode: null,
      scanFailed: true,
      failureCode: "page_unavailable",
      rawMetadata: {
        engine: "static-html-fallback",
        fallbackMode: true,
        resultConfidence: "low",
        scanFailed: true,
        failureCode: "page_unavailable",
        fetchFailureReason: "network_unreachable",
        message: "network_unreachable",
      },
      issues: [],
    };
    const deps: ProcessPageJobDeps = {
      runPageScan: vi.fn(async () => {
        throw browserError;
      }),
      runStaticPageScan: vi.fn(async () => failedStaticPage),
      persistPageResult: vi.fn(async () => undefined),
      completePageJob: vi.fn(async () => ({ aggregationWon: false })),
      failPageJob: vi.fn(async () => ({
        requeued: false,
        aggregationWon: false,
      })),
      renewOwnedScanClaim: vi.fn(async () => scan()),
      touchPageJob: vi.fn(async () => true),
      updateScanJob: vi.fn(async () => undefined),
      aggregateScan: vi.fn(),
    };

    await processPageJob(job, scan(), deps);

    expect(deps.persistPageResult).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({
        scanFailed: true,
        failureCode: "page_unavailable",
      }),
      expect.any(Object)
    );
    expect(deps.completePageJob).not.toHaveBeenCalled();
    expect(deps.failPageJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "page-1",
      "network_unreachable",
      "page_unavailable",
      "worker-1"
    );
  });
});
