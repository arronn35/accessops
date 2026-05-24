import { describe, expect, it, vi, afterEach } from "vitest";
import {
  captureVisualEvidenceForIssues,
  createEvidenceBudget,
  isSensitivePageUrl,
} from "./visual-evidence";
import type { NormalizedIssue, ScanViewport } from "./types";

const viewport: ScanViewport = { name: "desktop", width: 800, height: 600 };

function issue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    ruleId: "button-name",
    impact: "critical",
    severity: "critical",
    wcagTags: ["wcag2a"],
    description: "Buttons must have accessible names",
    help: "Buttons must have discernible text",
    target: ["button.bad"],
    humanReviewRequired: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("visual evidence privacy helpers", () => {
  it("flags likely private and payment URLs as sensitive", () => {
    expect(isSensitivePageUrl("https://example.com/checkout/payment")).toBe(true);
    expect(isSensitivePageUrl("https://example.com/account/settings")).toBe(true);
    expect(isSensitivePageUrl("https://example.com/pricing")).toBe(false);
  });

  it("marks evidence skipped when disabled by scan consent", async () => {
    const [out] = await captureVisualEvidenceForIssues({
      page: fakePage() as never,
      pageUrl: "https://example.com/",
      issues: [issue()],
      viewport,
      state: "initial",
      budget: createEvidenceBudget(10),
      enabled: false,
    });

    expect(out.visualEvidence?.screenshotStatus).toBe("skipped");
    expect(out.visualEvidence?.screenshotFailureReason).toBe("screenshot_disabled");
  });

  it("skips sensitive pages without touching selectors", async () => {
    const page = fakePage({ sensitive: false });
    const [out] = await captureVisualEvidenceForIssues({
      page: page as never,
      pageUrl: "https://example.com/dashboard/billing",
      issues: [issue()],
      viewport,
      state: "initial",
      budget: createEvidenceBudget(10),
      enabled: true,
    });

    expect(page.locator).not.toHaveBeenCalled();
    expect(out.visualEvidence?.screenshotFailureReason).toBe("sensitive_page_skipped");
  });

  it("records selector visibility failures without throwing", async () => {
    const [out] = await captureVisualEvidenceForIssues({
      page: fakePage({ visible: false }) as never,
      pageUrl: "https://example.com/",
      issues: [issue()],
      viewport,
      state: "initial",
      budget: createEvidenceBudget(10),
      enabled: true,
    });

    expect(out.visualEvidence?.screenshotStatus).toBe("skipped");
    expect(out.visualEvidence?.screenshotFailureReason).toBe("element_not_visible");
  });

  it("captures and decorates an element screenshot", async () => {
    const [out] = await captureVisualEvidenceForIssues({
      page: fakePage({ screenshot: blankPng() }) as never,
      pageUrl: "https://example.com/",
      issues: [issue()],
      viewport,
      state: "initial",
      budget: createEvidenceBudget(10),
      enabled: true,
    });

    expect(out.visualEvidence?.screenshotStatus).toBe("captured");
    expect(out.visualEvidence?.imageBuffer?.length).toBeGreaterThan(100);
  });

  it("enforces screenshot limits", async () => {
    const [out] = await captureVisualEvidenceForIssues({
      page: fakePage() as never,
      pageUrl: "https://example.com/",
      issues: [issue()],
      viewport,
      state: "initial",
      budget: createEvidenceBudget(0),
      enabled: true,
    });

    expect(out.visualEvidence?.screenshotFailureReason).toBe("screenshot_limit_reached");
  });
});

function fakePage(options: { visible?: boolean; sensitive?: boolean; screenshot?: Buffer } = {}) {
  const locator = {
    isVisible: vi.fn(async () => options.visible ?? true),
    scrollIntoViewIfNeeded: vi.fn(async () => undefined),
    boundingBox: vi.fn(async () => ({ x: 12, y: 14, width: 80, height: 40 })),
    screenshot: vi.fn(async () => options.screenshot ?? (await blankPng())),
    evaluate: vi.fn(async (_fn: unknown, arg?: unknown) => {
      if (arg) return undefined;
      return {
        previousOutline: "",
        previousOutlineOffset: "",
        previousBoxShadow: "",
      };
    }),
  };
  return {
    locator: vi.fn(() => ({ first: () => locator })),
    waitForTimeout: vi.fn(async () => undefined),
    screenshot: vi.fn(async () => options.screenshot ?? (await blankPng())),
    evaluate: vi.fn(async (_fn: unknown, arg?: unknown) => {
      if (arg && typeof arg === "object" && "reference" in arg) return [];
      if (arg && typeof arg === "object" && "overlayId" in arg) return undefined;
      if (typeof arg === "string") return undefined;
      return options.sensitive ?? false;
    }),
  };
}

function blankPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAYAAABpYH0BAAAAAXNSR0IArs4c6QAAAFJJREFUaEPt0AEJACAMwMD2XzqHwQnkQ6GFLA2fYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwHcB6VwAAX6bgqEAAAAASUVORK5CYII=",
    "base64"
  );
}
