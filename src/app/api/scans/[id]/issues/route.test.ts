/**
 * Role matrix for the scan issues endpoint.
 *
 * This route is both a read surface (needs view_scans) and a data export
 * (?format=csv additionally needs export_reports). It previously ran on a bare
 * requireSession(), so report_viewer could read findings and developer could
 * pull the CSV despite both permissions being false for those roles.
 *
 * requirePermission is exercised against the real entitlements matrix rather
 * than a stub, so a permission flag flipping in ROLE_PERMISSIONS shows up here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ROLE_PERMISSIONS, type WorkspaceRole } from "@/lib/entitlements";

const { currentRole, getScanJobMock, listIssuesMock, listScanPagesMock } = vi.hoisted(() => ({
  currentRole: { value: "owner" as WorkspaceRole },
  getScanJobMock: vi.fn(),
  listIssuesMock: vi.fn(),
  listScanPagesMock: vi.fn(),
}));

vi.mock("@/lib/api/context", async () => {
  const { roleHasPermission } = await import("@/lib/entitlements");
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message?: string
    ) {
      super(message ?? code);
    }
  }
  return {
    ApiError,
    requireSession: async () => ({
      userId: "user-1",
      workspaceId: "ws-1",
      role: currentRole.value,
    }),
    requirePermission: async (permission: string) => {
      if (!roleHasPermission(currentRole.value, permission as never)) {
        throw new ApiError(403, "forbidden");
      }
      return { userId: "user-1", workspaceId: "ws-1", role: currentRole.value };
    },
    apiError: (err: unknown) => {
      if (err instanceof ApiError) {
        return Response.json({ error: err.code }, { status: err.status });
      }
      return Response.json({ error: "internal" }, { status: 500 });
    },
  };
});

vi.mock("@/lib/data/firestore", () => ({
  getScanJob: getScanJobMock,
  listIssues: listIssuesMock,
  listScanPages: listScanPagesMock,
}));

import { GET } from "./route";

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as WorkspaceRole[];

// The route reads req.nextUrl.searchParams, so this must be a NextRequest.
function request(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/scans/scan-1/issues${query}`);
}
const params = Promise.resolve({ id: "scan-1" });

beforeEach(() => {
  currentRole.value = "owner";
  getScanJobMock.mockReset().mockResolvedValue({ id: "scan-1", workspaceId: "ws-1" });
  listIssuesMock.mockReset().mockResolvedValue([
    {
      id: "issue-1",
      ruleId: "color-contrast",
      severity: "critical",
      impact: "serious",
      help: "Fix contrast",
      scanPageId: "page-1",
    },
  ]);
  listScanPagesMock.mockReset().mockResolvedValue([
    { id: "page-1", url: "https://example.com/", title: "Home" },
  ]);
});

describe("GET /api/scans/:id/issues — role matrix", () => {
  it.each(ALL_ROLES)("JSON read for %s matches view_scans", async (role) => {
    currentRole.value = role;
    const res = await GET(request(), { params });
    const allowed = ROLE_PERMISSIONS[role].view_scans;

    expect(res.status).toBe(allowed ? 200 : 403);
    const body = await res.json();
    if (allowed) {
      expect(body.issues).toHaveLength(1);
    } else {
      // The denial must not leak a body: no findings, no totals.
      expect(body).toEqual({ error: "forbidden" });
      expect(listIssuesMock).not.toHaveBeenCalled();
    }
  });

  it.each(ALL_ROLES)("CSV export for %s needs view_scans AND export_reports", async (role) => {
    currentRole.value = role;
    const res = await GET(request("?format=csv"), { params });
    const perms = ROLE_PERMISSIONS[role];
    const allowed = perms.view_scans && perms.export_reports;

    expect(res.status).toBe(allowed ? 200 : 403);
    const text = await res.text();
    if (allowed) {
      expect(res.headers.get("content-type")).toContain("text/csv");
      expect(text).toContain("color-contrast");
    } else {
      expect(res.headers.get("content-type")).not.toContain("text/csv");
      expect(text).not.toContain("color-contrast");
    }
  });

  it("denies report_viewer the findings body", async () => {
    currentRole.value = "report_viewer";
    const res = await GET(request(), { params });
    expect(res.status).toBe(403);
  });

  it("lets developer read findings but not export CSV", async () => {
    currentRole.value = "developer";
    expect((await GET(request(), { params })).status).toBe(200);
    expect((await GET(request("?format=csv"), { params })).status).toBe(403);
  });
});
