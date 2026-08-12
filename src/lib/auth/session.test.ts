import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cookieGetMock,
  cookiesMock,
  getWorkspaceContextMock,
  verifyFirebaseSessionCookieMock,
} = vi.hoisted(() => ({
  cookieGetMock: vi.fn(),
  cookiesMock: vi.fn(),
  getWorkspaceContextMock: vi.fn(),
  verifyFirebaseSessionCookieMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminAuth: () => ({
    verifySessionCookie: verifyFirebaseSessionCookieMock,
  }),
}));

vi.mock("@/lib/data/firestore", () => ({
  getWorkspaceContext: getWorkspaceContextMock,
}));

import { apiError, ApiError, requireSession } from "@/lib/api/context";

beforeEach(() => {
  vi.clearAllMocks();
  cookieGetMock.mockReturnValue({ value: "firebase-session-cookie" });
  cookiesMock.mockResolvedValue({ get: cookieGetMock });
});

describe("requireSession", () => {
  it.each([
    "auth/session-cookie-expired",
    "auth/session-cookie-revoked",
  ])("returns the unauthorized contract for %s", async (code) => {
    verifyFirebaseSessionCookieMock.mockRejectedValue(
      Object.assign(new Error(code), { code })
    );

    const rejection = await requireSession().catch((error) => error);
    const response = apiError(rejection);

    expect(rejection).toBeInstanceOf(ApiError);
    expect(rejection).toMatchObject({
      status: 401,
      code: "unauthorized",
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "unauthorized",
    });
    expect(getWorkspaceContextMock).not.toHaveBeenCalled();
  });

  it("does not mask an unexpected Firebase infrastructure failure as 401", async () => {
    const infrastructureError = Object.assign(
      new Error("Firebase Auth backend unavailable"),
      { code: "auth/internal-error" }
    );
    verifyFirebaseSessionCookieMock.mockRejectedValue(infrastructureError);

    await expect(requireSession()).rejects.toBe(infrastructureError);
    expect(getWorkspaceContextMock).not.toHaveBeenCalled();
  });
});
