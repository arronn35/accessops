/**
 * Integration-style tests for POST /api/scans.
 *
 * Strategy: we mock only the session and rate-limiter. The validation
 * gates we care about (Zod consent check, URL/SSRF validation, rate
 * limiting) all run BEFORE any database access, so these tests exercise
 * the real handler code without needing live Firebase services.
 *
 * The happy-path (201 + enqueue) needs full DB mocking and is covered
 * by the manual `npm run scan:test` smoke script instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- mocks ---------------------------------------------------------
// vi.mock factories are hoisted above all imports, so the mock fns must
// be created with vi.hoisted() to exist when the factories run.
const {
  requireSessionMock,
  checkRateLimitMock,
  auditMock,
  countInflightScansMock,
  createScanJobMock,
  getPrivacySettingsMock,
  getWorkspaceMock,
  listScansMock,
  reserveScanQuotaMock,
  updateScanJobMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  auditMock: vi.fn(),
  countInflightScansMock: vi.fn(),
  createScanJobMock: vi.fn(),
  getPrivacySettingsMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  listScansMock: vi.fn(),
  reserveScanQuotaMock: vi.fn(),
  updateScanJobMock: vi.fn(),
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
    rateLimitError: (reset: number, remaining = 0, message = "Too many requests.") =>
      new ApiError(429, "rate_limited", message, {
        "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
        "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
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

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  countInflightScans: countInflightScansMock,
  createScanJob: createScanJobMock,
  getPrivacySettings: getPrivacySettingsMock,
  getWorkspace: getWorkspaceMock,
  listScans: listScansMock,
  reserveScanQuota: reserveScanQuotaMock,
  updateScanJob: updateScanJobMock,
}));

vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/scans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_SESSION = {
  userId: "user-1",
  workspaceId: "ws-1",
  role: "owner",
};

beforeEach(() => {
  requireSessionMock.mockReset();
  checkRateLimitMock.mockReset();
  auditMock.mockReset().mockResolvedValue(undefined);
  countInflightScansMock.mockReset().mockResolvedValue(0);
  createScanJobMock.mockReset().mockResolvedValue({ id: "scan-1" });
  getPrivacySettingsMock.mockReset().mockResolvedValue({
    visualEvidenceEnabled: false,
    screenshotStorageEnabled: false,
    aiProcessingEnabled: false,
  });
  getWorkspaceMock.mockReset().mockResolvedValue({ id: "ws-1", plan: "free" });
  listScansMock.mockReset().mockResolvedValue([]);
  reserveScanQuotaMock.mockReset().mockResolvedValue({
    maxPages: 3,
    usage: {},
  });
  updateScanJobMock.mockReset().mockResolvedValue(undefined);
  requireSessionMock.mockResolvedValue(VALID_SESSION);
  checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 4, reset: 0 });
});

describe("POST /api/scans — validation gates", () => {
  it("returns 401 when not signed in", async () => {
    const { ApiError } = await import("@/lib/api/context");
    requireSessionMock.mockRejectedValue(new ApiError(401, "unauthorized"));
    const res = await POST(makeRequest({ url: "https://example.com", permissionConfirmed: true }) as never);
    expect(res.status).toBe(401);
  });

  it("rejects a missing permission confirmation (400)", async () => {
    const res = await POST(makeRequest({ url: "https://example.com" }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("rejects permissionConfirmed:false (400)", async () => {
    const res = await POST(
      makeRequest({ url: "https://example.com", permissionConfirmed: false }) as never
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-URL string (400)", async () => {
    const res = await POST(
      makeRequest({ url: "not a url", permissionConfirmed: true }) as never
    );
    expect(res.status).toBe(400);
  });

  it("rejects a file:// URL (400)", async () => {
    const blocked = await POST(
      makeRequest({ url: "ftp://example.org", permissionConfirmed: true }) as never
    );
    expect(blocked.status).toBe(400);
  });

  it("rejects a private-IP URL via SSRF guard (400)", async () => {
    const res = await POST(
      makeRequest({ url: "http://10.0.0.5/admin", permissionConfirmed: true }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(["private_ip", "loopback", "metadata_address"]).toContain(body.error);
  });

  it("rejects the cloud-metadata IP (400)", async () => {
    const res = await POST(
      makeRequest({
        url: "http://169.254.169.254/latest/meta-data",
        permissionConfirmed: true,
      }) as never
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("metadata_address");
  });

  it("returns 429 with Retry-After header when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      reset: Date.now() + 30_000,
    });
    const res = await POST(
      makeRequest({ url: "https://example.org", permissionConfirmed: true }) as never
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("creates a scan when the active inflight count is below the workspace limit", async () => {
    countInflightScansMock.mockResolvedValue(0);

    const res = await POST(
      makeRequest({ url: "https://example.org", permissionConfirmed: true }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ scanJobId: "scan-1", mode: "queued" });
    expect(createScanJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        requestedBy: "user-1",
        status: "queued",
        baseUrl: "https://example.org",
      })
    );
  });

  it("creates a scan when the workspace plan is an unknown/legacy value (no 500)", async () => {
    // Regression: a workspace migrated from Drizzle (or with an unset `plan`)
    // used to make scanCapsForPlan() return undefined → `caps.maxPagesCap`
    // threw → opaque 500 → "Couldn't start scan". normalizePlan() floors it.
    getWorkspaceMock.mockResolvedValue({ id: "ws-1", plan: "pro" });

    const res = await POST(
      makeRequest({ url: "https://example.org", permissionConfirmed: true }) as never
    );

    expect(res.status).toBe(201);
    expect(createScanJobMock).toHaveBeenCalled();
  });

  it("does not 500 when the workspace plan field is null", async () => {
    getWorkspaceMock.mockResolvedValue({ id: "ws-1", plan: null });

    const res = await POST(
      makeRequest({ url: "https://example.org", permissionConfirmed: true }) as never
    );

    expect(res.status).toBe(201);
  });

  it("blocks creation when the non-stale inflight count reaches the workspace limit", async () => {
    countInflightScansMock.mockResolvedValue(1);

    const res = await POST(
      makeRequest({ url: "https://example.org", permissionConfirmed: true }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("scan_concurrency_limit");
    expect(createScanJobMock).not.toHaveBeenCalled();
  });
});
