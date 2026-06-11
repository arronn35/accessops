import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { purgeExpiredScanDataMock, firebaseAdminConfiguredMock } = vi.hoisted(() => ({
  purgeExpiredScanDataMock: vi.fn(),
  firebaseAdminConfiguredMock: vi.fn(),
}));

vi.mock("@/lib/data/deletion", () => ({
  purgeExpiredScanData: purgeExpiredScanDataMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminConfigured: firebaseAdminConfiguredMock,
}));

import { GET } from "./route";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/data-retention", { headers });
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  firebaseAdminConfiguredMock.mockReturnValue(true);
  purgeExpiredScanDataMock.mockResolvedValue({
    workspacesProcessed: 2,
    scansDeleted: 3,
    evidenceDeleted: 1,
  });
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("GET /api/cron/data-retention", () => {
  it("rejects requests without the cron secret when one is configured", async () => {
    process.env.CRON_SECRET = "s3cret";

    expect((await GET(request())).status).toBe(401);
    expect((await GET(request({ authorization: "Bearer wrong" }))).status).toBe(401);
    expect(purgeExpiredScanDataMock).not.toHaveBeenCalled();
  });

  it("runs the sweep with the correct bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";

    const res = await GET(request({ authorization: "Bearer s3cret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      workspacesProcessed: 2,
      scansDeleted: 3,
      evidenceDeleted: 1,
    });
  });

  it("returns 503 when Firebase Admin is not configured", async () => {
    delete process.env.CRON_SECRET;
    firebaseAdminConfiguredMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    expect(purgeExpiredScanDataMock).not.toHaveBeenCalled();
  });

  it("reports sweep failures as 500 without leaking details", async () => {
    delete process.env.CRON_SECRET;
    purgeExpiredScanDataMock.mockRejectedValue(new Error("firestore exploded"));

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("retention_sweep_failed");
  });
});
