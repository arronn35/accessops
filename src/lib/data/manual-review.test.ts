import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ parent: { exists: true, data: () => ({}) } as { exists: boolean; data: () => Record<string, unknown> }, row: undefined as Record<string, unknown> | undefined, reads: [] as string[], writes: 0 }));
vi.mock("@/lib/firebase/admin", () => ({ firestore: () => {
  const ref = (path: string): unknown => ({ path, collection: (name: string) => ref(`${path}/${name}`), doc: (id: string) => ref(`${path}/${id}`) });
  return {
    collection: (name: string) => ref(name),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      get: async (doc: { path: string }) => {
        state.reads.push(doc.path);
        return doc.path.endsWith("manualReviews/keyboard") ? { id: "keyboard", data: () => state.row } : state.parent;
      },
      set: (_ref: unknown, row: Record<string, unknown>) => { state.row = { ...row, createdAt: Timestamp.fromDate(row.createdAt as Date), updatedAt: Timestamp.fromDate(row.updatedAt as Date) }; state.writes++; },
    }),
  };
} }));
import { upsertManualReview } from "./firestore";
const input = { checkId: "keyboard", status: "passed" as const, notes: null, wcagCriteria: ["2.1.1"], reviewerUserId: "user-1", reviewerName: null, reviewerEmail: null };
beforeEach(() => { state.row = undefined; state.parent = { exists: true, data: () => ({}) }; state.reads = []; state.writes = 0; });
describe("transactional manual review writes", () => {
  it("reads the parent in the same transaction and increments revision", async () => {
    const first = await upsertManualReview("ws", "scan", input);
    const second = await upsertManualReview("ws", "scan", { ...input, reviewerUserId: "user-2" });
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(second.createdAt).toEqual(first.createdAt);
    expect(second.reviewerUserId).toBe("user-2");
    expect(state.reads.slice(0, 2)).toEqual(["workspaces/ws/scans/scan", "workspaces/ws/scans/scan/manualReviews/keyboard"]);
  });
  it.each([false, true])("refuses a missing or deleting parent (%s)", async (exists) => {
    state.parent = { exists, data: () => ({ deletionStartedAt: new Date() }) };
    await expect(upsertManualReview("ws", "scan", input)).rejects.toThrow("scan_unavailable_for_review");
    expect(state.writes).toBe(0);
  });
});
