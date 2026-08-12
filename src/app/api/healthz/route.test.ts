import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  firebaseAdminConfiguredMock,
  firestoreMock,
  getLatestWorkerHeartbeatMock,
  isWorkerHeartbeatFreshMock,
  listClaimableScanRefsMock,
  listClaimablePageJobRefsMock,
  listClaimableDataDeletionJobsMock,
  scanDispatchConfigurationMock,
} = vi.hoisted(() => ({
  firebaseAdminConfiguredMock: vi.fn(),
  firestoreMock: vi.fn(),
  getLatestWorkerHeartbeatMock: vi.fn(),
  isWorkerHeartbeatFreshMock: vi.fn(),
  listClaimableScanRefsMock: vi.fn(),
  listClaimablePageJobRefsMock: vi.fn(),
  listClaimableDataDeletionJobsMock: vi.fn(),
  scanDispatchConfigurationMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminConfigured: firebaseAdminConfiguredMock,
  firestore: firestoreMock,
}));

vi.mock("@/lib/data/worker-health", () => ({
  getLatestWorkerHeartbeat: getLatestWorkerHeartbeatMock,
  isWorkerHeartbeatFresh: isWorkerHeartbeatFreshMock,
}));

vi.mock("@/lib/data/firestore", () => ({
  listClaimableScanRefs: listClaimableScanRefsMock,
  listClaimablePageJobRefs: listClaimablePageJobRefsMock,
}));

vi.mock("@/lib/data/deletion", () => ({
  listClaimableDataDeletionJobs: listClaimableDataDeletionJobsMock,
}));

vi.mock("@/lib/scanner/dispatch", () => ({
  scanDispatchConfiguration: scanDispatchConfigurationMock,
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
  listClaimableScanRefsMock.mockResolvedValue([]);
  listClaimablePageJobRefsMock.mockResolvedValue([]);
  listClaimableDataDeletionJobsMock.mockResolvedValue([]);
  scanDispatchConfigurationMock.mockReturnValue({
    mode: "poll",
    configured: true,
    missing: [],
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
    expect(body.checks.worker.state).toBe("active");
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

  it("treats a scaled-to-zero Cloud Run worker as healthy when no work is pending", async () => {
    scanDispatchConfigurationMock.mockReturnValue({
      mode: "cloud-tasks",
      configured: true,
      missing: [],
    });
    getLatestWorkerHeartbeatMock.mockResolvedValue(
      new Date(Date.now() - 3_600_000)
    );
    isWorkerHeartbeatFreshMock.mockReturnValue(false);

    const res = await GET(request("/api/healthz?deep=1"));
    const body = await res.json();

    expect(body.degraded).toBe(false);
    expect(body.checks.worker.ok).toBe(true);
    expect(body.checks.worker.state).toBe("idle_or_scaled_to_zero");
  });

  it("degrades Cloud Tasks mode when work is pending and the worker is stale", async () => {
    scanDispatchConfigurationMock.mockReturnValue({
      mode: "cloud-tasks",
      configured: true,
      missing: [],
    });
    listClaimableScanRefsMock.mockResolvedValue([
      { workspaceId: "ws-1", scanId: "scan-1" },
    ]);
    getLatestWorkerHeartbeatMock.mockResolvedValue(
      new Date(Date.now() - 3_600_000)
    );
    isWorkerHeartbeatFreshMock.mockReturnValue(false);

    const res = await GET(request("/api/healthz?deep=1"));
    const body = await res.json();

    expect(body.degraded).toBe(true);
    expect(body.checks.worker.pending).toBe(true);
    expect(body.checks.worker.state).toBe("stale");
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
