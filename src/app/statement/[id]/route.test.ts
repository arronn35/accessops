import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getWorkspaceMock,
  getPrivacySettingsMock,
  listScansMock,
} = vi.hoisted(() => ({
  getWorkspaceMock: vi.fn(),
  getPrivacySettingsMock: vi.fn(),
  listScansMock: vi.fn(),
}));

vi.mock("@/lib/data/firestore", () => ({
  getWorkspace: getWorkspaceMock,
  getPrivacySettings: getPrivacySettingsMock,
  listScans: listScansMock,
}));

import { GET } from "./route";

const WORKSPACE = {
  id: "ws-1",
  name: "Acme",
  companyName: "Acme Corp",
  targetStandard: "wcag2aa",
};

const PRIVACY = {
  id: "settings",
  workspaceId: "ws-1",
  statementPublished: true,
  statementLimitations: "Old video subtitle limitations.",
  statementContactEmail: "accessibility@acme.com",
};

const SCANS = [
  {
    id: "scan-1",
    status: "completed",
    pagesScanned: 12,
    completedAt: new Date("2026-06-11T12:00:00.000Z"),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  getWorkspaceMock.mockResolvedValue(WORKSPACE);
  getPrivacySettingsMock.mockResolvedValue(PRIVACY);
  listScansMock.mockResolvedValue(SCANS);
});

describe("GET /statement/[id]", () => {
  it("returns 404 if statementPublished is false", async () => {
    getPrivacySettingsMock.mockResolvedValue({
      ...PRIVACY,
      statementPublished: false,
    });

    const res = await GET(new NextRequest("http://localhost/statement/ws-1"), {
      params: Promise.resolve({ id: "ws-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns HTML statement if published", async () => {
    const res = await GET(new NextRequest("http://localhost/statement/ws-1"), {
      params: Promise.resolve({ id: "ws-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Accessibility Statement");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Old video subtitle limitations.");
    expect(html).toContain("accessibility@acme.com");
    expect(html).toContain('href="mailto:accessibility@acme.com"');
  });

  it("escapes stored content and rejects unsafe contact schemes", async () => {
    getWorkspaceMock.mockResolvedValue({
      ...WORKSPACE,
      companyName: 'Acme <img src=x onerror="alert(1)">',
      targetStandard: 'wcag2aa"><script>alert(2)</script>',
    });
    getPrivacySettingsMock.mockResolvedValue({
      ...PRIVACY,
      statementLimitations: '<svg onload="alert(3)">',
      statementContactEmail: "javascript:alert(4)",
    });

    const res = await GET(new NextRequest("http://localhost/statement/ws-1"), {
      params: Promise.resolve({ id: "ws-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain(
      "default-src 'none'"
    );

    const html = await res.text();
    expect(html).toContain(
      "Acme &lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
    expect(html).toContain(
      "&lt;svg onload=&quot;alert(3)&quot;&gt;"
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("javascript:");
  });
});
