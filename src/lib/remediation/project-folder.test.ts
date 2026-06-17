import { describe, expect, it } from "vitest";
import { fallbackProjectFolder, projectFolderForScan } from "./project-folder";
import type { ScanJob } from "@/lib/data/types";

function scan(overrides: Partial<ScanJob> = {}): ScanJob {
  const now = new Date();
  return {
    id: "scan-1",
    workspaceId: "ws-1",
    projectId: null,
    requestedBy: "user-1",
    scanType: "single",
    status: "completed",
    baseUrl: "https://example.org/shop/",
    sourceUrlsJson: null,
    maxPages: 3,
    pagesDiscovered: 1,
    pagesScanned: 1,
    includeScreenshots: false,
    storeScreenshots: false,
    visualEvidenceMaxScreenshots: 0,
    aiExplanationsEnabled: false,
    aiRemediationEnabled: false,
    permissionConfirmed: true,
    progressStep: "completed",
    startedAt: now,
    completedAt: now,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("projectFolderForScan", () => {
  it("prefers explicit project ids", () => {
    expect(projectFolderForScan(scan({ projectId: "Storefront Redesign" }))).toEqual({
      projectKey: "storefront-redesign",
      projectLabel: "Storefront Redesign",
    });
  });

  it("falls back to the scanned host", () => {
    expect(projectFolderForScan(scan())).toEqual({
      projectKey: "example.org",
      projectLabel: "example.org",
    });
  });
});

describe("fallbackProjectFolder", () => {
  it("keeps persisted task metadata when present", () => {
    expect(
      fallbackProjectFolder({
        projectKey: "app",
        projectLabel: "App",
        sourceUrl: "https://example.org",
      })
    ).toEqual({ projectKey: "app", projectLabel: "App" });
  });

  it("groups legacy tasks by source host", () => {
    expect(fallbackProjectFolder({ sourceUrl: "https://legacy.example/a" })).toEqual({
      projectKey: "legacy.example",
      projectLabel: "legacy.example",
    });
  });
});
