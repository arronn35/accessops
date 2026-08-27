import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, setMock, auditMock, getWorkspaceContextMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  setMock: vi.fn(),
  auditMock: vi.fn(),
  getWorkspaceContextMock: vi.fn(),
}));

vi.mock("@/lib/api/context", () => {
  class ApiError extends Error {
    constructor(public readonly status: number, public readonly code: string) {
      super(code);
    }
  }
  return {
    ApiError,
    requireSession: requireSessionMock,
    apiError: (error: unknown) => error instanceof ApiError
      ? Response.json({ error: error.code }, { status: error.status })
      : Response.json({ error: "internal" }, { status: 500 }),
  };
});

vi.mock("@/lib/data/firestore", () => ({
  audit: auditMock,
  getWorkspaceContext: getWorkspaceContextMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  firestore: () => ({
    collection: () => ({
      doc: () => ({ set: setMock }),
    }),
  }),
}));

import { PATCH } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/me", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireSessionMock.mockReset().mockResolvedValue({
    userId: "user-1",
    workspaceId: "workspace-1",
  });
  setMock.mockReset().mockResolvedValue(undefined);
  auditMock.mockReset().mockResolvedValue(undefined);
  getWorkspaceContextMock.mockReset().mockResolvedValue({
    user: { id: "user-1", locale: "tr" },
  });
});

describe("PATCH /api/me", () => {
  it("persists a supported account language without overwriting profile fields", async () => {
    const response = await PATCH(request({ locale: "tr" }));

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledTimes(1);
    const [update, options] = setMock.mock.calls[0];
    expect(update).toMatchObject({ locale: "tr" });
    expect(update).not.toHaveProperty("name");
    expect(update).not.toHaveProperty("fullName");
    expect(update.updatedAt).toBeInstanceOf(Date);
    expect(options).toEqual({ merge: true });
  });

  it("rejects unsupported language values", async () => {
    const response = await PATCH(request({ locale: "de" }));

    expect(response.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });
});
