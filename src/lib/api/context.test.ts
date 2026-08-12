import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  verifySessionCookie: vi.fn(),
}));
vi.mock("@/lib/data/firestore", () => ({
  getWorkspaceContext: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({
  captureException: vi.fn(async () => undefined),
}));

import { apiError } from "./context";

describe("apiError", () => {
  it("returns a retryable 503 for a missing Firestore index", async () => {
    const response = apiError({
      code: 9,
      message:
        "9 FAILED_PRECONDITION: The query requires a COLLECTION_ASC index for collection scans and field status. https://console.firebase.google.com/firestore/indexes?create_exemption=abc",
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      error: "firestore_index_unavailable",
    });
  });
});
