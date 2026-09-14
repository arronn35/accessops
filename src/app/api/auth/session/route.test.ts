/**
 * F10: signup_completed fired on every session creation, so a returning user
 * signing in counted as a fresh signup and inflated the funnel. The account
 * creation itself is the signal, not the session.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyIdTokenMock,
  ensureUserAndWorkspaceMock,
  recordAnalyticsEventMock,
  createSessionCookieMock,
  setSessionCookieMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  ensureUserAndWorkspaceMock: vi.fn(),
  recordAnalyticsEventMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  setSessionCookieMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminAuth: () => ({ verifyIdToken: verifyIdTokenMock }),
}));
vi.mock("@/lib/data/firestore", () => ({
  ensureUserAndWorkspace: ensureUserAndWorkspaceMock,
}));
vi.mock("@/lib/analytics/firestore", () => ({
  recordAnalyticsEvent: recordAnalyticsEventMock,
}));
vi.mock("@/lib/auth/session", () => ({
  clearSessionCookie: vi.fn(),
  createFirebaseSessionCookie: createSessionCookieMock,
  setSessionCookie: setSessionCookieMock,
}));
// Run the deferred analytics write inline so the assertion can see it.
vi.mock("@/lib/server/after-response", () => ({
  afterResponse: (fn: () => unknown) => fn(),
}));

import { POST } from "./route";

function request(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ID_TOKEN = "x".repeat(40);

beforeEach(() => {
  verifyIdTokenMock.mockReset().mockResolvedValue({ uid: "user-1" });
  ensureUserAndWorkspaceMock.mockReset().mockResolvedValue({
    workspace: { id: "ws-1" },
    isNewUser: true,
  });
  recordAnalyticsEventMock.mockReset().mockResolvedValue(undefined);
  createSessionCookieMock.mockReset().mockResolvedValue("cookie");
  setSessionCookieMock.mockReset().mockResolvedValue(undefined);
});

const eventName = () => recordAnalyticsEventMock.mock.calls[0][0].event;

describe("POST /api/auth/session", () => {
  it("records signup_completed when the account was just created", async () => {
    const res = await POST(request({ idToken: ID_TOKEN }));

    expect(res.status).toBe(200);
    expect(eventName()).toBe("signup_completed");
  });

  it("records login_completed for a returning user", async () => {
    ensureUserAndWorkspaceMock.mockResolvedValue({
      workspace: { id: "ws-1" },
      isNewUser: false,
    });

    await POST(request({ idToken: ID_TOKEN }));

    expect(eventName()).toBe("login_completed");
  });

  it("counts one signup across a signup followed by three sign-ins", async () => {
    await POST(request({ idToken: ID_TOKEN }));
    ensureUserAndWorkspaceMock.mockResolvedValue({
      workspace: { id: "ws-1" },
      isNewUser: false,
    });
    await POST(request({ idToken: ID_TOKEN }));
    await POST(request({ idToken: ID_TOKEN }));
    await POST(request({ idToken: ID_TOKEN }));

    const events = recordAnalyticsEventMock.mock.calls.map((c) => c[0].event);
    expect(events.filter((e) => e === "signup_completed")).toHaveLength(1);
    expect(events.filter((e) => e === "login_completed")).toHaveLength(3);
  });

  it("refuses an off-origin callbackUrl", async () => {
    const res = await POST(
      request({ idToken: ID_TOKEN, callbackUrl: "//evil.com" })
    );

    expect((await res.json()).redirectTo).toBe("/app");
  });

  it("preserves a same-origin deep link", async () => {
    const res = await POST(
      request({ idToken: ID_TOKEN, callbackUrl: "/app/scans/abc?tab=issues" })
    );

    expect((await res.json()).redirectTo).toBe("/app/scans/abc?tab=issues");
  });
});
