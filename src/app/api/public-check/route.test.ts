import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { checkRateLimitMock, runPublicCheckMock, validateUrlMock } = vi.hoisted(
  () => ({
    checkRateLimitMock: vi.fn(),
    runPublicCheckMock: vi.fn(),
    validateUrlMock: vi.fn(),
  })
);

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/scanner/public-check", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scanner/public-check")>();
  return {
    ...actual,
    runPublicCheck: runPublicCheckMock,
  };
});

vi.mock("@/lib/scanner/url-validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scanner/url-validation")>();
  return {
    ...actual,
    validateUrl: validateUrlMock,
  };
});

import { UrlValidationFailed } from "@/lib/scanner/url-validation";
import { POST } from "./route";

function request(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/public-check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.20",
      "user-agent": "route-test",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimitMock.mockResolvedValue({
    ok: true,
    remaining: 4,
    reset: Date.now() + 60_000,
  });
  validateUrlMock.mockResolvedValue({
    normalized: "https://example.org/",
    origin: "https://example.org",
  });
  runPublicCheckMock.mockResolvedValue({
    url: "https://example.org/",
    title: "Example",
    score: 88,
    grade: "B",
    riskLevel: "low",
    issueCounts: {
      critical: 0,
      serious: 1,
      moderate: 0,
      minor: 0,
      review: 0,
    },
    wcagIssueCount: 1,
    bestPracticeIssueCount: 0,
    manualReviewCount: 0,
    topFindings: [],
    durationMs: 20,
    engine: "static-html-preview",
    confidence: "low",
    persisted: false,
    limitations: [],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/public-check", () => {
  it("returns an ephemeral result with no-cache and budget headers", async () => {
    const res = await POST(request({ url: "https://example.org" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-rate-limit-remaining")).toBe("4");
    expect(body).toMatchObject({
      url: "https://example.org/",
      persisted: false,
      engine: "static-html-preview",
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "publicCheck",
      expect.stringMatching(/^[a-f0-9]{32}$/),
      { failureMode: "closed" }
    );
  });

  it("rejects malformed input", async () => {
    const res = await POST(request({ url: "example.org" }));

    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(runPublicCheckMock).not.toHaveBeenCalled();
  });

  it("maps blocked targets to a safe public error", async () => {
    validateUrlMock.mockRejectedValue(
      new UrlValidationFailed("private_ip", "127.0.0.1")
    );

    const res = await POST(request({ url: "http://127.0.0.1" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("private_ip");
    expect(JSON.stringify(body)).not.toContain("127.0.0.1");
  });

  it("rejects work when the distributed limiter is unavailable", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      reason: "backend_unavailable",
    });

    const res = await POST(request({ url: "https://example.org" }));

    expect(res.status).toBe(503);
    expect(runPublicCheckMock).not.toHaveBeenCalled();
  });

  it("enforces the anonymous request budget", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      reason: "limit_exceeded",
    });

    const res = await POST(request({ url: "https://example.org" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(runPublicCheckMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before consuming checker capacity", async () => {
    const res = await POST(
      request(
        { url: "https://example.org" },
        { "content-length": "5000" }
      )
    );

    expect(res.status).toBe(413);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("stops reading a chunked body once it crosses the byte budget", async () => {
    const res = await POST(request({ url: `https://example.org/${"a".repeat(5000)}` }));

    expect(res.status).toBe(413);
    expect(runPublicCheckMock).not.toHaveBeenCalled();
  });

  it("is hidden when the production kill switch is disabled", async () => {
    vi.stubEnv("PUBLIC_CHECK_ENABLED", "false");

    const res = await POST(request({ url: "https://example.org" }));

    expect(res.status).toBe(404);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });
});
