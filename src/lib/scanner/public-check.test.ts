import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedPage } from "./types";

const { runStaticScanJobMock } = vi.hoisted(() => ({
  runStaticScanJobMock: vi.fn(),
}));

vi.mock("./static-runner", () => ({
  runStaticScanJob: runStaticScanJobMock,
}));

import { PublicCheckUnavailable, runPublicCheck } from "./public-check";

function page(overrides: Partial<NormalizedPage> = {}): NormalizedPage {
  return {
    url: "https://percevia.test/",
    title: "Percevia",
    statusCode: 200,
    scannedAt: new Date(),
    issues: [
      {
        ruleId: "image-alt",
        impact: "critical",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag111"],
        description: "Images need alternative text.",
        help: "Images must have alternate text",
        target: ["img.hero"],
        htmlSnippet: '<img src="private-campaign.jpg">',
        humanReviewRequired: false,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runPublicCheck", () => {
  it("returns a bounded result without raw page content", async () => {
    runStaticScanJobMock.mockResolvedValue({
      pages: [page()],
      pagesDiscovered: 1,
      pagesScanned: 1,
      durationMs: 42,
    });

    const result = await runPublicCheck("https://percevia.test/");

    expect(result).toMatchObject({
      url: "https://percevia.test/",
      engine: "static-html-preview",
      confidence: "low",
      persisted: false,
      durationMs: 42,
    });
    expect(result.topFindings[0]).toEqual({
      ruleId: "image-alt",
      impact: "critical",
      description: "Images need alternative text.",
      help: "Images must have alternate text",
      wcagTags: ["wcag2a", "wcag111"],
      humanReviewRequired: false,
    });
    expect(JSON.stringify(result)).not.toContain("private-campaign.jpg");
    expect(runStaticScanJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxPages: 1,
        scanType: "single",
        includeScreenshots: false,
        storeScreenshots: false,
      })
    );
  });

  it("rejects pages that could not be analyzed", async () => {
    runStaticScanJobMock.mockResolvedValue({
      pages: [page({ scanFailed: true, issues: [] })],
      pagesDiscovered: 1,
      pagesScanned: 1,
      durationMs: 10,
    });

    await expect(runPublicCheck("https://percevia.test/")).rejects.toBeInstanceOf(
      PublicCheckUnavailable
    );
  });
});
