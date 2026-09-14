import { beforeEach, describe, expect, it, vi } from "vitest";

const { firebaseAdminConfiguredMock, firestoreMock } = vi.hoisted(() => ({
  firebaseAdminConfiguredMock: vi.fn(),
  firestoreMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminConfigured: firebaseAdminConfiguredMock,
  firestore: firestoreMock,
}));

import { anonymousNetworkKey, checkRateLimit, limiters } from "./rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkRateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    firebaseAdminConfiguredMock.mockReturnValue(false);
  });

  it("allows up to the configured max and then rejects", async () => {
    const key = `user-${crypto.randomUUID()}`;

    for (let i = 0; i < limiters.scanCreate.max; i++) {
      const result = await checkRateLimit("scanCreate", key);
      expect(result.ok).toBe(true);
    }
    const rejected = await checkRateLimit("scanCreate", key);
    expect(rejected.ok).toBe(false);
    expect(rejected.remaining).toBe(0);
  });

  it("tracks limiters and keys independently", async () => {
    const key = `user-${crypto.randomUUID()}`;

    for (let i = 0; i < limiters.scanCreate.max + 1; i++) {
      await checkRateLimit("scanCreate", key);
    }
    expect((await checkRateLimit("scanCreate", `other-${key}`)).ok).toBe(true);
    expect((await checkRateLimit("aiExplain", key)).ok).toBe(true);
  });
});

describe("checkRateLimit (Firestore-backed)", () => {
  beforeEach(() => {
    firebaseAdminConfiguredMock.mockReturnValue(true);
  });

  function fakeFirestore(stored: { count?: number; resetAtMs?: number } | null) {
    const writes: Record<string, unknown>[] = [];
    const docRef = {};
    const db = {
      collection: vi.fn(() => ({ doc: vi.fn(() => docRef) })),
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          get: async () => ({
            exists: stored !== null,
            data: () =>
              stored === null
                ? undefined
                : {
                    count: stored.count,
                    resetAt: {
                      toMillis: () => stored.resetAtMs ?? 0,
                    },
                  },
          }),
          set: (_ref: unknown, value: Record<string, unknown>) => {
            writes.push(value);
          },
          update: (_ref: unknown, value: Record<string, unknown>) => {
            writes.push(value);
          },
        }),
    };
    firestoreMock.mockReturnValue(db);
    return { writes };
  }

  it("starts a fresh window when no counter exists", async () => {
    const { writes } = fakeFirestore(null);

    const result = await checkRateLimit("scanCreate", "user-a");

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(limiters.scanCreate.max - 1);
    expect(writes[0]).toMatchObject({ count: 1 });
    expect(writes[0]).toHaveProperty("expireAt");
  });

  it("increments inside an active window and rejects past the max", async () => {
    const resetAtMs = Date.now() + 30_000;
    fakeFirestore({ count: limiters.scanCreate.max, resetAtMs });

    const result = await checkRateLimit("scanCreate", "user-a");

    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reset).toBe(resetAtMs);
  });

  it("resets an expired window", async () => {
    fakeFirestore({ count: 99, resetAtMs: Date.now() - 1_000 });

    const result = await checkRateLimit("scanCreate", "user-a");

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(limiters.scanCreate.max - 1);
  });

  it("fails open when Firestore is unavailable", async () => {
    firestoreMock.mockImplementation(() => {
      throw new Error("firestore down");
    });

    const result = await checkRateLimit("scanCreate", "user-a");

    expect(result.ok).toBe(true);
  });

  it("can fail closed for unauthenticated compute endpoints", async () => {
    firestoreMock.mockImplementation(() => {
      throw new Error("firestore down");
    });

    const result = await checkRateLimit("publicCheck", "visitor-a", {
      failureMode: "closed",
    });

    expect(result).toMatchObject({
      ok: false,
      remaining: 0,
      reason: "backend_unavailable",
    });
  });
});

describe("anonymousNetworkKey", () => {
  const headers = (init: Record<string, string>) => new Headers(init);

  it("ignores User-Agent rotation from the same address", () => {
    const a = anonymousNetworkKey(
      headers({ "x-forwarded-for": "203.0.113.20", "user-agent": "one" })
    );
    const b = anonymousNetworkKey(
      headers({ "x-forwarded-for": "203.0.113.20", "user-agent": "two" })
    );
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{32}$/);
  });

  it("separates different source addresses", () => {
    const a = anonymousNetworkKey(headers({ "x-forwarded-for": "203.0.113.20" }));
    const b = anonymousNetworkKey(headers({ "x-forwarded-for": "198.51.100.7" }));
    expect(a).not.toBe(b);
  });

  it("never embeds the raw address", () => {
    const key = anonymousNetworkKey(headers({ "x-forwarded-for": "203.0.113.20" }));
    expect(key).not.toContain("203.0.113.20");
  });
});
