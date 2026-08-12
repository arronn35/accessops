import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  requireSessionMock,
  listNotificationsMock,
  getNotificationsSeenAtMock,
  markNotificationsSeenMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  listNotificationsMock: vi.fn(),
  getNotificationsSeenAtMock: vi.fn(),
  markNotificationsSeenMock: vi.fn(),
}));

vi.mock("@/lib/api/context", () => {
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
    requireSession: requireSessionMock,
    apiError: (err: unknown) => {
      if (err instanceof ApiError) {
        return Response.json(
          { error: err.code, message: err.message },
          { status: err.status }
        );
      }
      return Response.json({ error: "internal" }, { status: 500 });
    },
  };
});

vi.mock("@/lib/data/firestore", () => ({
  listNotifications: listNotificationsMock,
  getNotificationsSeenAt: getNotificationsSeenAtMock,
  markNotificationsSeen: markNotificationsSeenMock,
}));

import { GET, POST } from "./route";

const VALID_SESSION = {
  userId: "user-1",
  workspaceId: "ws-1",
  role: "owner",
};

beforeEach(() => {
  requireSessionMock.mockReset().mockResolvedValue(VALID_SESSION);
  listNotificationsMock.mockReset().mockResolvedValue([]);
  getNotificationsSeenAtMock.mockReset().mockResolvedValue(null);
  markNotificationsSeenMock.mockReset().mockResolvedValue(undefined);
});

describe("GET /api/notifications", () => {
  it("returns 401 when not signed in", async () => {
    const { ApiError } = await import("@/lib/api/context");
    requireSessionMock.mockRejectedValue(new ApiError(401, "unauthorized"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns mapped notifications, unread count, and lastSeenAt", async () => {
    const logs = [
      {
        id: "log-1",
        userId: "user-1",
        workspaceId: "ws-1",
        action: "scan.created",
        resourceType: "scan",
        resourceId: "scan-1",
        createdAt: new Date("2026-06-11T10:00:00.000Z"),
      },
    ];
    listNotificationsMock.mockResolvedValue(logs);
    getNotificationsSeenAtMock.mockResolvedValue(new Date("2026-06-11T09:00:00.000Z"));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unreadCount).toBe(1);
    expect(body.lastSeenAt).toBe("2026-06-11T09:00:00.000Z");
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].title).toBe("Scan started");
  });
});

describe("POST /api/notifications", () => {
  it("returns 401 when not signed in", async () => {
    const { ApiError } = await import("@/lib/api/context");
    requireSessionMock.mockRejectedValue(new ApiError(401, "unauthorized"));
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("marks notifications as seen and returns ok: true", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(markNotificationsSeenMock).toHaveBeenCalledWith("ws-1", "user-1");
  });
});
