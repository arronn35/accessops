import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  checkRateLimitMock,
  roleHasPermissionMock,
  explainIssueMock,
  buildAiScanContextMock,
  auditMock,
  getPrivacySettingsMock,
  getScanJobMock,
  listIssueGroupsMock,
  listIssuesMock,
  listScanPagesMock,
  saveAssistantResultMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  roleHasPermissionMock: vi.fn(),
  explainIssueMock: vi.fn(),
  buildAiScanContextMock: vi.fn(),
  auditMock: vi.fn(),
  getPrivacySettingsMock: vi.fn(),
  getScanJobMock: vi.fn(),
  listIssueGroupsMock: vi.fn(),
  listIssuesMock: vi.fn(),
  listScanPagesMock: vi.fn(),
  saveAssistantResultMock: vi.fn(),
}));

vi.mock("@/lib/api/context", () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message?: string,
      public readonly headers?: Record<string, string>
    ) {
      super(message ?? code);
    }
  }

  return {
    ApiError,
    requireSession: requireSessionMock,
    rateLimitError: (reset: number, remaining: number, message: string) =>
      new ApiError(429, "rate_limited", message, {
        "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
        "X-RateLimit-Remaining": String(remaining),
      }),
    apiError: (err: unknown) => {
      if (err instanceof ApiError) {
        return Response.json(
          { error: err.code, message: err.message },
          { status: err.status, headers: err.headers }
        );
      }
      return Response.json({ error: "internal" }, { status: 500 });
    },
  };
});

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/entitlements", () => ({
  roleHasPermission: roleHasPermissionMock,
}));

vi.mock("@/lib/ai/explain", () => {
  class AiUnavailableError extends Error {}
  class AiRequestError extends Error {
    name = "AiRequestError";

    constructor(
      public readonly code: string,
      public readonly retryAfterMs?: number
    ) {
      super(code);
    }
  }

  return {
    AiRequestError,
    AiUnavailableError,
    explainIssue: explainIssueMock,
  };
});

vi.mock("@/lib/ai/scan-context", () => ({
  buildAiScanContext: buildAiScanContextMock,
}));

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  getPrivacySettings: getPrivacySettingsMock,
  getScanJob: getScanJobMock,
  listIssueGroups: listIssueGroupsMock,
  listIssues: listIssuesMock,
  listScanPages: listScanPagesMock,
  saveAssistantResult: saveAssistantResultMock,
}));

import { AiRequestError } from "@/lib/ai/explain";
import { POST } from "./route";

const validBody = {
  prompt: "Create a remediation plan for this scan.",
  framework: "React / Next.js",
  preset: "react",
  scanJobId: "scan-1",
} as const;

function request(body: unknown): Request {
  return new Request("http://localhost/api/ai-assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionMock.mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-1",
    role: "owner",
  });
  roleHasPermissionMock.mockReturnValue(true);
  getPrivacySettingsMock.mockResolvedValue({ aiProcessingEnabled: true });
  checkRateLimitMock.mockResolvedValue({
    ok: true,
    remaining: 59,
    reset: Date.now() + 60_000,
  });
  getScanJobMock.mockResolvedValue({
    id: "scan-1",
    baseUrl: "https://example.com",
  });
  listIssuesMock.mockResolvedValue([
    {
      id: "issue-1",
      ruleId: "button-name",
      description: "A button has no accessible name.",
      help: "Buttons must have discernible text.",
      wcagTagsJson: ["wcag2a"],
      htmlSnippet: "<button></button>",
      severity: "critical",
    },
  ]);
  listScanPagesMock.mockResolvedValue([]);
  listIssueGroupsMock.mockResolvedValue([]);
  buildAiScanContextMock.mockReturnValue("Selected scan context");
  explainIssueMock.mockResolvedValue({
    explanationPlain: "Add an accessible name.",
    remediationSummary: "Fix the shared button component.",
    codeFixExample: '<button aria-label="Save"></button>',
    verification: "Re-run the scan.",
    modelProvider: "mock",
  });
  saveAssistantResultMock.mockResolvedValue({
    preset: "react",
    framework: "React / Next.js",
    primaryIssueSnippet: "<button></button>",
    createdAt: new Date("2026-08-26T12:00:00.000Z"),
  });
  auditMock.mockResolvedValue(undefined);
});

describe("POST /api/ai-assistant", () => {
  it("rejects invalid input before rate limiting or scan reads", async () => {
    const res = await POST(request({ ...validBody, prompt: "x" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(getScanJobMock).not.toHaveBeenCalled();
  });

  it("preserves the workspace AI-processing gate", async () => {
    getPrivacySettingsMock.mockResolvedValue({ aiProcessingEnabled: false });

    const res = await POST(request(validBody));

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: "ai_processing_disabled",
    });
    expect(explainIssueMock).not.toHaveBeenCalled();
  });

  it("returns a real before snippet and persists the generated plan", async () => {
    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(explainIssueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: "button-name",
        htmlSnippet: "<button></button>",
        mode: "react",
        projectContext: "Selected scan context",
      })
    );
    expect(saveAssistantResultMock).toHaveBeenCalledWith("ws-1", {
      scanJobId: "scan-1",
      preset: "react",
      framework: "React / Next.js",
      primaryIssueSnippet: "<button></button>",
      createdBy: "user-1",
      payload: expect.objectContaining({ modelProvider: "mock" }),
    });
    await expect(res.json()).resolves.toMatchObject({
      result: {
        primaryIssueSnippet: "<button></button>",
        createdAt: "2026-08-26T12:00:00.000Z",
      },
    });
  });

  it("does not invent a before snippet when the scan has no issue HTML", async () => {
    listIssuesMock.mockResolvedValue([
      {
        id: "issue-1",
        ruleId: "color-contrast",
        description: "Contrast is too low.",
        help: "Text must have sufficient contrast.",
        wcagTagsJson: ["wcag2aa"],
        htmlSnippet: null,
        severity: "serious",
      },
    ]);
    saveAssistantResultMock.mockResolvedValue({
      preset: "react",
      framework: "React / Next.js",
      primaryIssueSnippet: null,
      createdAt: new Date("2026-08-26T12:00:00.000Z"),
    });

    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(saveAssistantResultMock).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ primaryIssueSnippet: null })
    );
    await expect(res.json()).resolves.toMatchObject({
      result: { primaryIssueSnippet: null },
    });
  });

  it("maps provider rate limits and skips persistence", async () => {
    explainIssueMock.mockRejectedValue(new AiRequestError("ai_rate_limited", 3_000));

    const res = await POST(request(validBody));

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3");
    await expect(res.json()).resolves.toMatchObject({
      error: "ai_rate_limited",
      retryAfterSeconds: 3,
    });
    expect(saveAssistantResultMock).not.toHaveBeenCalled();
  });
});
