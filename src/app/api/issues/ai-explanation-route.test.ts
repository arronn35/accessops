import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  checkRateLimitMock,
  roleHasPermissionMock,
  explainIssueMock,
  auditMock,
  getIssueMock,
  getPrivacySettingsMock,
  getScanJobMock,
  saveAiExplanationMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  roleHasPermissionMock: vi.fn(),
  explainIssueMock: vi.fn(),
  auditMock: vi.fn(),
  getIssueMock: vi.fn(),
  getPrivacySettingsMock: vi.fn(),
  getScanJobMock: vi.fn(),
  saveAiExplanationMock: vi.fn(),
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

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  getIssue: getIssueMock,
  getPrivacySettings: getPrivacySettingsMock,
  getScanJob: getScanJobMock,
  saveAiExplanation: saveAiExplanationMock,
}));

import { POST } from "./[id]/ai-explanation/route";
import { AiRequestError } from "@/lib/ai/explain";

const params = { params: Promise.resolve({ id: "issue-1" }) };

function request(body: unknown): Request {
  return new Request("http://localhost/api/issues/issue-1/ai-explanation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function malformedRequest(): Request {
  return new Request("http://localhost/api/issues/issue-1/ai-explanation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not-json",
  });
}

const validBody = {
  scanJobId: "scan-1",
  framework: "react",
  consentChecked: true,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionMock.mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-1",
    role: "owner",
  });
  roleHasPermissionMock.mockReturnValue(true);
  checkRateLimitMock.mockResolvedValue({
    ok: true,
    remaining: 59,
    reset: Date.now() + 60_000,
  });
  getScanJobMock.mockResolvedValue({
    id: "scan-1",
    aiExplanationsEnabled: true,
  });
  getIssueMock.mockResolvedValue({
    id: "issue-1",
    ruleId: "button-name",
    description: "A button has no accessible name.",
    help: "Buttons must have discernible text.",
    wcagTagsJson: ["wcag2a"],
    htmlSnippet: "<button></button>",
  });
  getPrivacySettingsMock.mockResolvedValue({ aiProcessingEnabled: true });
  explainIssueMock.mockResolvedValue({
    explanationPlain: "Add an accessible name.",
    remediationSummary: "Label the button.",
    codeFixExample: "<button aria-label=\"Save\"></button>",
    verification: "Re-run the scan.",
    modelProvider: "mock",
  });
  saveAiExplanationMock.mockResolvedValue({
    createdAt: new Date("2026-08-26T12:00:00.000Z"),
  });
  auditMock.mockResolvedValue(undefined);
});

describe("POST /api/issues/[id]/ai-explanation", () => {
  it("returns deterministic 400 responses for malformed JSON", async () => {
    const res = await POST(malformedRequest(), params);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects oversized prompts", async () => {
    const res = await POST(
      request({ ...validBody, prompt: "x".repeat(2001) }),
      params
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("requires the output acknowledgement", async () => {
    const res = await POST(
      request({ scanJobId: "scan-1", framework: "react" }),
      params
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects unknown body keys", async () => {
    const res = await POST(
      request({ ...validBody, internalOverride: true }),
      params
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects scan ids that are unsafe as Firestore document paths", async () => {
    const res = await POST(
      request({ ...validBody, scanJobId: "scan-1/issues/issue-2" }),
      params
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it.each([
    { framework: "unknown-framework" },
    { mode: "untrusted-mode" },
  ])("rejects unsupported framework or mode values: %j", async (override) => {
    const res = await POST(
      request({ ...validBody, ...override }),
      params
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_input" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rate limits before reading scan, issue, or privacy data", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(429);
    expect(getScanJobMock).not.toHaveBeenCalled();
    expect(getIssueMock).not.toHaveBeenCalled();
    expect(getPrivacySettingsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the scan does not exist", async () => {
    getScanJobMock.mockResolvedValue(null);

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "not_found" });
  });

  it("returns 404 when the issue is not under the requested scan", async () => {
    getIssueMock.mockResolvedValue(null);

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(404);
    expect(getIssueMock).toHaveBeenCalledWith("ws-1", "scan-1", "issue-1");
    expect(explainIssueMock).not.toHaveBeenCalled();
  });

  it("rejects scans that were created with AI explanations off", async () => {
    getScanJobMock.mockResolvedValue({
      id: "scan-1",
      aiExplanationsEnabled: false,
    });

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: "ai_disabled_for_scan",
    });
    expect(explainIssueMock).not.toHaveBeenCalled();
  });

  it("preserves the workspace AI processing gate", async () => {
    getPrivacySettingsMock.mockResolvedValue({ aiProcessingEnabled: false });

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: "ai_processing_disabled",
    });
    expect(explainIssueMock).not.toHaveBeenCalled();
  });

  it("uses tenant-scoped direct reads and audits the acknowledgement", async () => {
    const res = await POST(
      request({
        ...validBody,
        prompt: "  Explain this for a developer.  ",
      }),
      params
    );

    expect(res.status).toBe(200);
    expect(checkRateLimitMock).toHaveBeenCalledWith("aiExplain", "ws-1");
    expect(getScanJobMock).toHaveBeenCalledWith("ws-1", "scan-1");
    expect(getIssueMock).toHaveBeenCalledWith("ws-1", "scan-1", "issue-1");
    expect(getPrivacySettingsMock).toHaveBeenCalledWith("ws-1");
    expect(explainIssueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: "button-name",
        framework: "react",
        mode: "issue",
        userPrompt: "Explain this for a developer.",
      })
    );
    expect(auditMock).toHaveBeenCalledWith({
      userId: "user-1",
      workspaceId: "ws-1",
      action: "ai.explain",
      resourceType: "issue",
      resourceId: "issue-1",
      metadata: {
        provider: "mock",
        model: null,
        scanId: "scan-1",
        outputAcknowledgedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        ),
      },
    });
    expect(saveAiExplanationMock).toHaveBeenCalledWith("ws-1", {
      scanJobId: "scan-1",
      issueId: "issue-1",
      framework: "react",
      mode: "issue",
      createdBy: "user-1",
      payload: expect.objectContaining({ modelProvider: "mock" }),
    });
    await expect(res.json()).resolves.toMatchObject({
      explanation: { createdAt: "2026-08-26T12:00:00.000Z" },
      aiExplanation: { createdAt: "2026-08-26T12:00:00.000Z" },
    });
  });

  it.each([
    ["ai_timeout", 504],
    ["ai_refused", 502],
    ["ai_incomplete", 502],
    ["ai_bad_response", 502],
    ["ai_provider_error", 502],
  ] as const)("maps %s provider failures to HTTP %i", async (code, status) => {
    explainIssueMock.mockRejectedValue(new AiRequestError(code));

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(status);
    await expect(res.json()).resolves.toMatchObject({ error: code });
    expect(saveAiExplanationMock).not.toHaveBeenCalled();
  });

  it("maps provider rate limits with retry guidance", async () => {
    explainIssueMock.mockRejectedValue(new AiRequestError("ai_rate_limited", 2_000));

    const res = await POST(request(validBody), params);

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("2");
    await expect(res.json()).resolves.toMatchObject({
      error: "ai_rate_limited",
      retryAfterSeconds: 2,
    });
  });
});
