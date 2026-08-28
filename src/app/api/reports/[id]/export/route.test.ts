/**
 * Tests for GET /api/reports/:id/export.
 *
 * Strategy mirrors src/app/api/scans/route.test.ts: mock the session,
 * the rate limiter, and audit. The database is kept out of the picture
 * by mocking `loadReportInput` — the one function the handler uses to
 * read from Postgres — so the real renderers (HTML, CSV, PDF) still run
 * and the response headers are asserted end to end.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReportInput } from "@/lib/reports/render";

const { requireSessionMock, checkRateLimitMock, loadReportInputMock } = vi.hoisted(
  () => ({
    requireSessionMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    loadReportInputMock: vi.fn(),
  })
);

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

vi.mock("@/lib/api/rate-limit", () => ({ checkRateLimit: checkRateLimitMock }));
vi.mock("@/lib/api/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/reports/load", () => ({ loadReportInput: loadReportInputMock }));

import { GET } from "./route";

const REPORT_ID = "11111111-2222-3333-4444-555555555555";
const VALID_SESSION = { userId: "user-1", workspaceId: "ws-1", role: "owner" };

function makeRequest(format?: string) {
  const url = new URL(`http://localhost/api/reports/${REPORT_ID}/export`);
  if (format) url.searchParams.set("format", format);
  // The handler only touches `nextUrl`; a plain Request plus that field
  // is enough and avoids pulling NextRequest into the node test env.
  const req = new Request(url) as Request & { nextUrl: URL };
  req.nextUrl = url;
  return req as unknown as Parameters<typeof GET>[0];
}

const params = { params: Promise.resolve({ id: REPORT_ID }) };

function fakeInput(): ReportInput {
  return {
    title: "Test report",
    workspaceName: "Acme",
    scanId: "scan-1",
    baseUrl: "https://example.org/",
    pagesScanned: 2,
    scanDate: new Date("2026-05-20T10:00:00Z"),
    counts: { critical: 1, moderate: 0, minor: 0, passed: 0, review: 0 },
    issues: [
      {
        id: "i1",
        ruleId: "button-name",
        severity: "critical",
        impact: "critical",
        description: "Buttons must have discernible text",
        help: "Buttons must have an accessible name",
        helpUrl: "https://example.org/help",
        wcagTags: ["wcag2a", "wcag412"],
        pageUrl: "https://example.org/x",
        pageTitle: "X",
      },
    ],
  };
}

beforeEach(() => {
  requireSessionMock.mockReset();
  checkRateLimitMock.mockReset();
  loadReportInputMock.mockReset();
  requireSessionMock.mockResolvedValue(VALID_SESSION);
  checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 29, reset: 0 });
  loadReportInputMock.mockResolvedValue({
    report: { id: REPORT_ID, workspaceId: "ws-1" },
    input: fakeInput(),
  });
});

describe("GET /api/reports/:id/export", () => {
  it("returns HTML by default", async () => {
    const res = await GET(makeRequest(), params);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    await expect(res.text()).resolves.toMatch(/not a legal certification/i);
  });

  it("returns a CSV download", async () => {
    const res = await GET(makeRequest("csv"), params);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename="accessops-report-${REPORT_ID}.csv"`
    );
    const body = await res.text();
    expect(body.split("\n")[0]).toMatch(/issue_id.*rule_id.*severity/);
    expect(body).toMatch(/button-name/);
  });

  it("returns a real PDF download, with no worker or storage configured", async () => {
    const res = await GET(makeRequest("pdf"), params);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename="accessops-report-${REPORT_ID}.pdf"`
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(res.headers.get("content-length")).toBe(String(bytes.byteLength));
  });

  it("rejects an unknown format", async () => {
    const res = await GET(makeRequest("docx"), params);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_format" });
  });

  it("404s a report belonging to another workspace", async () => {
    loadReportInputMock.mockResolvedValue({
      report: { id: REPORT_ID, workspaceId: "other-ws" },
      input: fakeInput(),
    });
    const res = await GET(makeRequest("pdf"), params);
    expect(res.status).toBe(404);
  });

  it("404s a missing report", async () => {
    loadReportInputMock.mockResolvedValue(null);
    const res = await GET(makeRequest("csv"), params);
    expect(res.status).toBe(404);
  });

  it("surfaces rate limiting as 429", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    const res = await GET(makeRequest("pdf"), params);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
