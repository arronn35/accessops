import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireSessionMock,
  checkRateLimitMock,
  auditMock,
  getReportMock,
  getWorkspaceMock,
  buildReportInputMock,
  renderPdfFromHtmlMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  auditMock: vi.fn(),
  getReportMock: vi.fn(),
  getWorkspaceMock: vi.fn(),
  buildReportInputMock: vi.fn(),
  renderPdfFromHtmlMock: vi.fn(),
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
  getReport: getReportMock,
  getWorkspace: getWorkspaceMock,
}));

vi.mock("@/lib/reports/build-input", () => ({
  buildReportInput: buildReportInputMock,
}));

vi.mock("@/lib/reports/pdf", () => ({
  renderPdfFromHtml: renderPdfFromHtmlMock,
}));

import { GET } from "./route";
import type { ReportInput } from "@/lib/reports/render";

const ctx = { userId: "user-1", workspaceId: "ws-1", role: "owner" };
const report = {
  id: "report-1",
  workspaceId: "ws-1",
  scanJobId: "scan-1",
  title: "Test report",
};

const input: ReportInput = {
  title: "Test report",
  workspaceName: "Acme",
  scanId: "scan-1",
  baseUrl: "https://example.org",
  pagesScanned: 1,
  scanDate: new Date("2026-05-20T10:00:00Z"),
  counts: { critical: 1, moderate: 0, minor: 0, passed: 0, review: 0 },
  issues: [
    {
      id: "issue-1",
      ruleId: "button-name",
      severity: "critical",
      impact: "critical",
      description: "Buttons need names",
      help: "Button missing accessible name",
      wcagTags: ["wcag412"],
      pageUrl: "https://example.org",
      pageTitle: "Home",
    },
  ],
};

function params() {
  return { params: Promise.resolve({ id: "report-1" }) };
}

function request(format: string) {
  return new NextRequest(`http://test/api/reports/report-1/export?format=${format}`);
}

beforeEach(() => {
  requireSessionMock.mockReset().mockResolvedValue(ctx);
  checkRateLimitMock.mockReset().mockResolvedValue({ ok: true, remaining: 4, reset: 0 });
  auditMock.mockReset().mockResolvedValue(undefined);
  getReportMock.mockReset().mockResolvedValue(report);
  getWorkspaceMock.mockReset().mockResolvedValue({ id: "ws-1", name: "Acme", plan: "agency" });
  buildReportInputMock.mockReset().mockResolvedValue(input);
  renderPdfFromHtmlMock.mockReset().mockResolvedValue(Buffer.from("%PDF-1.4"));
});

describe("GET /api/reports/[id]/export", () => {
  it("downloads HTML instead of redirecting to preview", async () => {
    const res = await GET(request("html"), params());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="accessops-report-report-1.html"'
    );
  });

  it("downloads CSV with attachment headers", async () => {
    const res = await GET(request("csv"), params());
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="accessops-report-report-1.csv"'
    );
    expect(body).toMatch(/issue_id/);
  });

  it("renders PDFs through the server-side PDF renderer", async () => {
    const res = await GET(request("pdf"), params());
    const body = Buffer.from(await res.arrayBuffer()).toString();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="accessops-report-report-1.pdf"'
    );
    expect(body).toBe("%PDF-1.4");
    expect(renderPdfFromHtmlMock).toHaveBeenCalledWith(expect.stringContaining("<!doctype html>"));
  });

  it("fails loudly when PDF generation is unavailable", async () => {
    renderPdfFromHtmlMock.mockRejectedValue(new Error("chromium missing"));

    const res = await GET(request("pdf"), params());
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("pdf_unavailable");
  });
});
