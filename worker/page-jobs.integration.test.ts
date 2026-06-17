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
          throw Object.assign(new Error("Page scan exceeded its deadline."), {
            code: "page_deadline_exceeded",
          });
        }
        return normalized(job);
      }),
      persistPageResult: vi.fn(async (_scanId, page, options) => {
        storedPages.set(options.pageJobId, page);
      }),
      completePageJob: vi.fn(async () => ({ aggregationWon: finalize("done") })),
      failPageJob: vi.fn(async (_workspaceId, _scanId, id, error, errorCode, _workerId) => {
        const current = id === "page-3" && failedJobs.has(id) ? 2 : 1;
        if (current < 2) {
          failedJobs.set(id, { ...pageJob(3, 2), status: "queued", error, errorCode });
          return { requeued: true, aggregationWon: false };
        }
        failedJobs.set(id, { ...pageJob(3, 2), status: "failed", error, errorCode });
        return { requeued: false, aggregationWon: finalize("failed") };
      }),
      touchPageJob: vi.fn(async () => true),
      updateScanJob: vi.fn(async () => undefined),
      aggregateScan: vi.fn(async () => {
        aggregateCalls += 1;
        const summary = calculateScanScore([...storedPages.values()]);
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
      errorCode: "page_deadline_exceeded",
    });
  });
});
