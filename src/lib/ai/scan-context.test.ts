import { describe, expect, it } from "vitest";
import { buildAiScanContext } from "./scan-context";
import type { AccessibilityIssue, IssueGroup, ScanJob, ScanPage } from "@/lib/data/types";

const now = new Date("2026-05-20T10:00:00Z");

function scan(): ScanJob {
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    projectId: "Storefront",
    requestedBy: "user-1",
    scanType: "single",
    status: "completed",
    baseUrl: "https://example.org",
    sourceUrlsJson: null,
    maxPages: 3,
    pagesDiscovered: 1,
    pagesScanned: 1,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: true,
    aiRemediationEnabled: true,
    permissionConfirmed: true,
    progressStep: "completed",
    startedAt: now,
    completedAt: now,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

function issue(overrides: Partial<AccessibilityIssue> = {}): AccessibilityIssue {
  return {
    id: "issue-1",
    scanJobId: "scan-1",
    scanPageId: "page-1",
    groupId: "group-1",
    ruleId: "button-name",
    impact: "critical",
    severity: "critical",
    wcagTagsJson: ["wcag412"],
    description: "Buttons must have names",
    help: "Button missing accessible name",
    helpUrl: null,
    htmlSnippet: "<button><svg /></button>",
    failureSummary: null,
    humanReviewRequired: false,
    falsePositive: false,
    status: "to_review",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const page: ScanPage = {
  id: "page-1",
  scanJobId: "scan-1",
  url: "https://example.org/cart",
  title: "Cart",
  statusCode: 200,
  scannedAt: now,
};

const group: IssueGroup = {
  id: "group-1",
  scanJobId: "scan-1",
  rootCauseKey: "button-name",
  ruleId: "button-name",
  title: "Buttons missing names",
  severity: "critical",
  affectedCount: 2,
  primaryWcagTag: "wcag412",
  summary: null,
  recommendedFix: "Add accessible labels",
  priority: 10,
  createdAt: now,
};

describe("buildAiScanContext", () => {
  it("summarizes project, scan, groups, and representative issues", () => {
    const context = buildAiScanContext({
      scan: scan(),
      issues: [issue(), issue({ id: "issue-2", severity: "moderate" })],
      pages: [page],
      groups: [group],
    });

    expect(context).toMatch(/Project folder: Storefront/);
    expect(context).toMatch(/Issue counts: critical 1, moderate 1/);
    expect(context).toMatch(/Buttons missing names/);
    expect(context).toMatch(/https:\/\/example.org\/cart/);
  });
});
