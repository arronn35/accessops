/**
 * Integration-style tests for POST /api/scans.
 *
 * Strategy: we mock only the session and rate-limiter. The validation
 * gates we care about (Zod consent check, URL/SSRF validation, rate
 * limiting) all run BEFORE any database access, so these tests exercise
 * the real handler code without needing a live Postgres or Redis.
 *
 * The happy-path (201 + enqueue) needs full DB mocking and is covered
 * by the manual `npm run scan:test` smoke script instead.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- mocks ---------------------------------------------------------
// vi.mock factories are hoisted above all imports, so the mock fns must
// be created with vi.hoisted() to exist when the factories run.
const { requireSessionMock, checkRateLimitMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

// next-auth doesn't resolve cleanly under Vitest's resolver. Stub the
// whole auth module so `@/lib/api/context` can be imported for real
// (we still override requireSession below).
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/api/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/context")>(
    "@/lib/api/context"
  );
  return { ...actual, requireSession: requireSessionMock };
});

vi.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

// queue + audit are never reached in these tests, but stub them so the
// module graph doesn't try to open a Redis connection on import.
vi.mock("@/lib/queue", () => ({
  enqueueScan: vi.fn(),
}));
vi.mock("@/lib/api/audit", () => ({ audit: vi.fn() }));

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
});
