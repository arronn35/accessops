import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScanJob } from "@/lib/data/types";
import type { ScanOutcome } from "./types";

const data = vi.hoisted(() => ({
  audit: vi.fn(),
  clearScanPageResult: vi.fn(),
  clearScanGroups: vi.fn(),
  clearScanResultCollections: vi.fn(),
  finalizeOwnedScanJob: vi.fn(),
  incrementPagesUsage: vi.fn(),
  listIssues: vi.fn(),
  listPageJobs: vi.fn(),
  listScanPages: vi.fn(),
  maxPersistedIssuesPerScan: vi.fn(),
  renewOwnedScanClaim: vi.fn(),
  syncRemediationTasksForScan: vi.fn(),
  updateIssueGroupId: vi.fn(),
  writeIssue: vi.fn(),
  writeIssueGroup: vi.fn(),
  writeScanPage: vi.fn(),
  writeScanSummary: vi.fn(),
  writeVisualEvidence: vi.fn(),
}));

vi.mock("@/lib/data/firestore", () => data);

import {
  aggregateScan,
  completeScanJob,
  markScanFailed,
  persistScanOutcome,
} from "./persistence";

function scan(overrides: Partial<ScanJob> = {}): ScanJob {
  const at = new Date("2026-07-27T12:00:00.000Z");
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    projectId: null,
    requestedBy: "user-1",
    scanType: "single",
    status: "running",
    baseUrl: "https://example.com",
    sourceUrlsJson: null,
    maxPages: 1,
    pagesDiscovered: 1,
    pagesScanned: 1,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "processing",
    startedAt: at,
    completedAt: null,
    errorMessage: null,
    claimedBy: "worker-1",
    usePageJobs: true,
    phase: "aggregating",
    pagesTotal: 1,
    pagesDone: 1,
    pagesFailed: 0,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

const outcome: ScanOutcome = {
  pages: [
    {
      url: "https://example.com",
      title: "Example",
      statusCode: 200,
      scannedAt: new Date("2026-07-27T12:00:00.000Z"),
      issues: [],
    },
  ],
  pagesDiscovered: 1,
  pagesScanned: 1,
  durationMs: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  data.maxPersistedIssuesPerScan.mockReturnValue(100);
  data.listIssues.mockResolvedValue([]);
  data.listPageJobs.mockResolvedValue([]);
  data.listScanPages.mockResolvedValue([
    {
      id: "page-1",
      scanJobId: "scan-1",
      url: "https://example.com",
      title: "Example",
      statusCode: 200,
      scannedAt: new Date("2026-07-27T12:00:00.000Z"),
      rawMetadataJson: {},
    },
  ]);
  data.syncRemediationTasksForScan.mockResolvedValue(0);
  data.writeScanPage.mockResolvedValue({ id: "page-1" });
  data.writeIssue.mockResolvedValue({ id: "issue-1" });
});

describe("owned legacy scan persistence", () => {
  it("does not clear existing result collections after ownership is lost", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(null);

    await expect(
      persistScanOutcome("scan-1", [], {
        workspaceId: "ws-1",
        workerId: "worker-1",
      })
    ).resolves.toBe(false);

    expect(data.clearScanResultCollections).not.toHaveBeenCalled();
    expect(data.writeScanPage).not.toHaveBeenCalled();
  });

  it("stops before writing a page when ownership is lost after the clear", async () => {
    data.renewOwnedScanClaim
      .mockResolvedValueOnce(scan({ usePageJobs: false }))
      .mockResolvedValueOnce(null);

    await expect(
      persistScanOutcome(
        "scan-1",
        [
          {
            url: "https://example.com",
            title: "Example",
            statusCode: 200,
            scannedAt: new Date(),
            issues: [],
          },
        ],
        {
          workspaceId: "ws-1",
          workerId: "worker-1",
        }
      )
    ).resolves.toBe(false);

    expect(data.clearScanResultCollections).toHaveBeenCalledOnce();
    expect(data.writeScanPage).not.toHaveBeenCalled();
  });

  it("fails only through the owner-checked terminal transaction", async () => {
    data.finalizeOwnedScanJob.mockResolvedValue(false);

    await expect(
      markScanFailed("ws-1", "scan-1", "scan_timeout", "worker-1")
    ).resolves.toBe(false);

    expect(data.finalizeOwnedScanJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "worker-1",
      expect.objectContaining({
        status: "failed",
        phase: "failed",
        errorMessage: "scan_timeout",
      })
    );
    expect(data.incrementPagesUsage).not.toHaveBeenCalled();
    expect(data.audit).not.toHaveBeenCalled();
  });

  it("does not run completion side effects when the terminal transaction loses", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(scan({ usePageJobs: false }));
    data.finalizeOwnedScanJob.mockResolvedValue(false);

    await expect(
      completeScanJob("scan-1", outcome, {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toBe(false);

    expect(data.finalizeOwnedScanJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "worker-1",
      expect.objectContaining({ status: "completed" })
    );
    expect(data.syncRemediationTasksForScan).not.toHaveBeenCalled();
    expect(data.incrementPagesUsage).not.toHaveBeenCalled();
    expect(data.audit).not.toHaveBeenCalled();
  });

  it("runs quota, remediation, and audit only after winning completion", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(scan({ usePageJobs: false }));
    data.finalizeOwnedScanJob.mockResolvedValue(true);
    data.syncRemediationTasksForScan.mockResolvedValue(2);

    await expect(
      completeScanJob("scan-1", outcome, {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toBe(true);

    expect(data.syncRemediationTasksForScan).toHaveBeenCalledOnce();
    expect(data.incrementPagesUsage).toHaveBeenCalledWith("ws-1", 1);
    expect(data.audit).toHaveBeenCalledOnce();
  });

  it("terminally fails an all-failed legacy outcome without publishing a score", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(scan({ usePageJobs: false }));
    data.finalizeOwnedScanJob.mockResolvedValue(true);

    await expect(
      completeScanJob(
        "scan-1",
        {
          ...outcome,
          pages: [
            {
              ...outcome.pages[0],
              title: null,
              statusCode: null,
              scanFailed: true,
              failureCode: "page_unavailable",
            },
          ],
        },
        {
          workspaceId: "ws-1",
          userId: "user-1",
          workerId: "worker-1",
        }
      )
    ).resolves.toBe(true);

    expect(data.writeScanSummary).not.toHaveBeenCalled();
    expect(data.finalizeOwnedScanJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "worker-1",
      expect.objectContaining({
        status: "failed",
        phase: "failed",
        errorCode: "all_pages_failed",
      })
    );
    expect(data.incrementPagesUsage).not.toHaveBeenCalled();
    expect(data.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "scan.failed" })
    );
  });
});

describe("owned per-page aggregation", () => {
  it("does not rewrite summary or groups without the live aggregation claim", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(null);

    await expect(
      aggregateScan("scan-1", {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toBeNull();

    expect(data.writeScanSummary).not.toHaveBeenCalled();
    expect(data.clearScanGroups).not.toHaveBeenCalled();
    expect(data.finalizeOwnedScanJob).not.toHaveBeenCalled();
  });

  it("stops before summary persistence when the aggregation claim is lost mid-read", async () => {
    data.renewOwnedScanClaim
      .mockResolvedValueOnce(scan())
      .mockResolvedValueOnce(null);

    await expect(
      aggregateScan("scan-1", {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toBeNull();

    expect(data.listScanPages).toHaveBeenCalledOnce();
    expect(data.listIssues).toHaveBeenCalledOnce();
    expect(data.writeScanSummary).not.toHaveBeenCalled();
    expect(data.clearScanGroups).not.toHaveBeenCalled();
    expect(data.finalizeOwnedScanJob).not.toHaveBeenCalled();
  });

  it("suppresses aggregation side effects when a sweeper wins before terminalization", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(scan());
    data.finalizeOwnedScanJob.mockResolvedValue(false);

    await expect(
      aggregateScan("scan-1", {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toBeNull();

    expect(data.writeScanSummary).toHaveBeenCalledOnce();
    expect(data.clearScanGroups).toHaveBeenCalledOnce();
    expect(data.syncRemediationTasksForScan).not.toHaveBeenCalled();
    expect(data.incrementPagesUsage).not.toHaveBeenCalled();
    expect(data.audit).not.toHaveBeenCalled();
  });

  it("preserves failed-page counters and URLs from page jobs in the summary", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(
      scan({ pagesTotal: 2, pagesDone: 1, pagesFailed: 1 })
    );
    data.listPageJobs.mockResolvedValue([
      {
        id: "page-job-failed",
        scanJobId: "scan-1",
        workspaceId: "ws-1",
        url: "https://example.com/blocked",
        status: "failed",
        attempts: 2,
        maxAttempts: 2,
        deadlineMs: 60_000,
        errorCode: "page_unavailable",
        createdAt: new Date(),
      },
    ]);
    data.finalizeOwnedScanJob.mockResolvedValue(true);

    await expect(
      aggregateScan("scan-1", {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toMatchObject({
      phase: "completed_with_errors",
      pagesDone: 1,
      pagesFailed: 1,
    });

    expect(data.writeScanSummary).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      expect.objectContaining({
        pagesFailedToScan: 1,
        failedPageUrls: ["https://example.com/blocked"],
        pageScoresJson: [
          expect.objectContaining({ url: "https://example.com" }),
        ],
      })
    );
  });

  it("round-trips a stored failed-page marker and terminally fails without a summary", async () => {
    data.renewOwnedScanClaim.mockResolvedValue(scan());
    data.listScanPages.mockResolvedValue([
      {
        id: "page-failed",
        scanJobId: "scan-1",
        url: "https://example.com/unavailable",
        title: null,
        statusCode: null,
        scannedAt: new Date(),
        rawMetadataJson: {
          scanFailed: true,
          failureCode: "page_unavailable",
        },
      },
    ]);
    data.finalizeOwnedScanJob.mockResolvedValue(true);

    await expect(
      aggregateScan("scan-1", {
        workspaceId: "ws-1",
        userId: "user-1",
        workerId: "worker-1",
      })
    ).resolves.toMatchObject({ phase: "failed", pagesDone: 0 });

    expect(data.writeScanSummary).not.toHaveBeenCalled();
    expect(data.finalizeOwnedScanJob).toHaveBeenCalledWith(
      "ws-1",
      "scan-1",
      "worker-1",
      expect.objectContaining({
        status: "failed",
        errorCode: "all_pages_failed",
      })
    );
    expect(data.incrementPagesUsage).not.toHaveBeenCalled();
  });
});
