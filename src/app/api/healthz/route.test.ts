import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  firebaseAdminConfiguredMock,
  firestoreMock,
  getLatestWorkerHeartbeatMock,
  isWorkerHeartbeatFreshMock,
} = vi.hoisted(() => ({
  firebaseAdminConfiguredMock: vi.fn(),
  firestoreMock: vi.fn(),
  getLatestWorkerHeartbeatMock: vi.fn(),
  isWorkerHeartbeatFreshMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminConfigured: firebaseAdminConfiguredMock,
  firestore: firestoreMock,
}));

vi.mock("@/lib/data/worker-health", () => ({
  getLatestWorkerHeartbeat: getLatestWorkerHeartbeatMock,
  isWorkerHeartbeatFresh: isWorkerHeartbeatFreshMock,
}));

import { GET } from "./route";

function request(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  firebaseAdminConfiguredMock.mockReturnValue(true);
  firestoreMock.mockReturnValue({
    collection: () => ({ limit: () => ({ get: async () => ({}) }) }),
  });
});

describe("GET /api/healthz", () => {
  it("returns liveness without touching Firestore", async () => {
    firebaseAdminConfiguredMock.mockReturnValue(false);

    const res = await GET(request("/api/healthz"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("liveness");
    expect(firestoreMock).not.toHaveBeenCalled();
  });

  it("deep check reports a fresh worker", async () => {
    getLatestWorkerHeartbeatMock.mockResolvedValue(new Date());
    isWorkerHeartbeatFreshMock.mockReturnValue(true);

    const res = await GET(request("/api/healthz?deep=1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.degraded).toBe(false);
    expect(body.checks.worker.ok).toBe(true);
    expect(typeof body.checks.worker.lastSeenSecondsAgo).toBe("number");
  });

  it("deep check marks a stale worker as degraded but stays ready", async () => {
    getLatestWorkerHeartbeatMock.mockResolvedValue(new Date(Date.now() - 3_600_000));
    isWorkerHeartbeatFreshMock.mockReturnValue(false);

    const res = await GET(request("/api/healthz?deep=1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.degraded).toBe(true);
    expect(body.checks.worker.ok).toBe(false);
  });

  it("deep check fails readiness when Firebase Admin is unconfigured", async () => {
    firebaseAdminConfiguredMock.mockReturnValue(false);

    const res = await GET(request("/api/healthz?deep=1"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.checks.firestore.ok).toBe(false);
    // Worker freshness is unknowable without Firestore access.
    expect(body.checks.worker.ok).toBe(false);
  });

  it("never exposes worker identifiers in the response", async () => {
    getLatestWorkerHeartbeatMock.mockResolvedValue(new Date());
    isWorkerHeartbeatFreshMock.mockReturnValue(true);

    const res = await GET(request("/api/healthz?deep=1"));
    const text = JSON.stringify(await res.json());

    expect(text).not.toMatch(/workerId|hostname|inflight/i);
  });
});
