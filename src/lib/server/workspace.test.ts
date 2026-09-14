/**
 * requirePagePermission behaviour: the role check itself, and the redirect
 * targets it produces. The source-level contract lives in
 * page-permissions.test.ts; this covers what actually happens at request time.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLE_PERMISSIONS, type WorkspaceRole } from "@/lib/entitlements";

const { redirectMock, verifySessionCookieMock, getWorkspaceContextMock, pathnameHeader } = vi.hoisted(() => ({
  pathnameHeader: { value: null as string | null },
  redirectMock: vi.fn((url: string) => {
    // next/navigation's redirect throws to unwind the render; mirror that so
    // callers cannot accidentally continue past a denial.
    throw new Error(`REDIRECT:${url}`);
  }),
  verifySessionCookieMock: vi.fn(),
  getWorkspaceContextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => (name === "x-pathname" ? pathnameHeader.value : null),
  }),
}));
vi.mock("@/lib/auth/session", () => ({ verifySessionCookie: verifySessionCookieMock }));
vi.mock("@/lib/data/firestore", () => ({ getWorkspaceContext: getWorkspaceContextMock }));

import { requirePagePermission, getCurrentWorkspaceOrRedirect } from "./workspace";

function contextFor(role: WorkspaceRole) {
  return {
    userId: "user-1",
    user: { id: "user-1" },
    workspace: { id: "ws-1", plan: "team" },
    member: { userId: "user-1", workspaceId: "ws-1", role, status: "active" },
    privacy: {},
    limits: {},
  };
}

beforeEach(() => {
  pathnameHeader.value = null;
  redirectMock.mockClear();
  verifySessionCookieMock.mockReset().mockResolvedValue({ uid: "user-1" });
  getWorkspaceContextMock.mockReset().mockResolvedValue(contextFor("owner"));
});

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as WorkspaceRole[];

describe("requirePagePermission", () => {
  it.each(ALL_ROLES)("view_scans for %s follows the entitlements matrix", async (role) => {
    getWorkspaceContextMock.mockResolvedValue(contextFor(role));

    if (ROLE_PERMISSIONS[role].view_scans) {
      const ctx = await requirePagePermission("view_scans");
      expect(ctx.member.role).toBe(role);
      expect(redirectMock).not.toHaveBeenCalled();
    } else {
      await expect(requirePagePermission("view_scans")).rejects.toThrow(
        "REDIRECT:/app/no-access?need=view_scans"
      );
    }
  });

  it("sends report_viewer to no-access instead of rendering findings", async () => {
    getWorkspaceContextMock.mockResolvedValue(contextFor("report_viewer"));

    await expect(requirePagePermission("view_scans")).rejects.toThrow(
      "REDIRECT:/app/no-access?need=view_scans"
    );
  });

  it("denies client_viewer the AI surface but allows the scan surface", async () => {
    getWorkspaceContextMock.mockResolvedValue(contextFor("client_viewer"));

    await expect(requirePagePermission("view_ai")).rejects.toThrow(
      "REDIRECT:/app/no-access?need=view_ai"
    );
    await expect(requirePagePermission("view_scans")).resolves.toBeTruthy();
  });

  it("denies developer the billing surface", async () => {
    getWorkspaceContextMock.mockResolvedValue(contextFor("developer"));

    await expect(requirePagePermission("manage_billing")).rejects.toThrow(
      "REDIRECT:/app/no-access?need=manage_billing"
    );
  });

  it("still redirects an unauthenticated caller to sign-in", async () => {
    verifySessionCookieMock.mockResolvedValue(null);

    await expect(requirePagePermission("view_scans")).rejects.toThrow(
      "REDIRECT:/auth/sign-in"
    );
    expect(getWorkspaceContextMock).not.toHaveBeenCalled();
  });

  it("carries the deep link through sign-in when the session has expired", async () => {
    verifySessionCookieMock.mockResolvedValue(null);
    pathnameHeader.value = "/app/scans/abc?tab=issues";

    await expect(requirePagePermission("view_scans")).rejects.toThrow(
      "REDIRECT:/auth/sign-in?callbackUrl=%2Fapp%2Fscans%2Fabc%3Ftab%3Dissues"
    );
  });

  it("ignores an off-origin x-pathname rather than redirecting to it", async () => {
    verifySessionCookieMock.mockResolvedValue(null);
    pathnameHeader.value = "//evil.com";

    await expect(requirePagePermission("view_scans")).rejects.toThrow(
      "REDIRECT:/auth/sign-in"
    );
  });

  it("sends a user with no workspace to onboarding", async () => {
    getWorkspaceContextMock.mockResolvedValue(null);

    await expect(getCurrentWorkspaceOrRedirect()).rejects.toThrow("REDIRECT:/onboarding");
  });
});
