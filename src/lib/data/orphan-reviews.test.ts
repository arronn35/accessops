import { describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { deleteOrphanManualReview } from "./orphan-reviews";
it.each([[true, true, false], [false, true, true], [false, false, false]])("orphan cleanup with parent=%s and review=%s", async (parentExists, reviewExists, expected) => {
  const parent = {};
  const ref = { parent: { parent } };
  const remove = vi.fn();
  const db = { doc: () => ref, runTransaction: async (fn: (tx: unknown) => Promise<boolean>) => fn({ get: async (doc: unknown) => ({ exists: doc === parent ? parentExists : reviewExists }), delete: remove }) } as unknown as Firestore;
  expect(await deleteOrphanManualReview(db, "workspaces/ws/scans/scan/manualReviews/check")).toBe(expected);
  expect(remove).toHaveBeenCalledTimes(expected ? 1 : 0);
});
describe("orphan audit scope", () => {
  it("refuses paths outside manual reviews", async () => {
    await expect(deleteOrphanManualReview({} as Firestore, "users/user")).rejects.toThrow("Invalid");
  });
});
