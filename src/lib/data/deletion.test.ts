import { beforeEach, describe, expect, it, vi } from "vitest";

const { firestoreMock } = vi.hoisted(() => ({
  firestoreMock: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  firestore: firestoreMock,
}));

vi.mock("./firestore", () => ({
  audit: vi.fn(),
  getPrivacySettings: vi.fn(),
  readDoc: (id: string, data: Record<string, unknown> | undefined) =>
    data ? { id, ...data } : null,
  stripUndefined: (value: Record<string, unknown>) => value,
}));

import {
  deleteScanCompletely,
  deleteWorkspaceScanData,
} from "./deletion";

interface FakeRow {
  id: string;
  data: Record<string, unknown>;
}

interface FakeFilter {
  field: string;
  op: string;
  value: unknown;
}

class FakeFirestore {
  readonly rows = new Map<string, FakeRow[]>();
  readonly deletedPaths: string[] = [];

  seed(path: string, rows: FakeRow[]): void {
    this.rows.set(path, rows);
  }

  collection(path: string) {
    return this.query(path, []);
  }

  batch() {
    const refs: Array<{ path: string }> = [];
    return {
      delete: (ref: { path: string }) => refs.push(ref),
      set: vi.fn(),
      commit: async () => {
        for (const ref of refs) this.deletePath(ref.path);
      },
    };
  }

  private query(path: string, filters: FakeFilter[]) {
    const query = {
      path,
      where: (field: string, op: string, value: unknown) =>
        this.query(path, [...filters, { field, op, value }]),
      limit: () => query,
      select: () => query,
      count: () => ({
          get: async () => ({
            data: () => ({ count: this.matchingRows(path, filters).length }),
          }),
        }),
      get: async () => this.snapshot(path, filters),
      doc: (id: string) => {
        const refPath = `${path}/${id}`;
        return {
          id,
          path: refPath,
          collection: (name: string) => this.query(`${refPath}/${name}`, []),
          delete: async () => this.deletePath(refPath),
          set: vi.fn(),
          get: async () => {
            const row = (this.rows.get(path) ?? []).find((item) => item.id === id);
            return this.docSnapshot(path, row ?? { id, data: {} });
          },
        };
      },
    };
    return query;
  }

  private matchingRows(path: string, filters: FakeFilter[]): FakeRow[] {
    return (this.rows.get(path) ?? []).filter((row) =>
      filters.every(({ field, op, value }) => {
        const actual = row.data[field];
        if (op === "==") return actual === value;
        if (op === "in" && Array.isArray(value)) return value.includes(actual);
        return true;
      })
    );
  }

  private snapshot(path: string, filters: FakeFilter[]) {
    const docs = this.matchingRows(path, filters).map((row) =>
      this.docSnapshot(path, row)
    );
    return { empty: docs.length === 0, size: docs.length, docs };
  }

  private docSnapshot(path: string, row: FakeRow) {
    return {
      id: row.id,
      ref: { path: `${path}/${row.id}` },
      data: () => row.data,
      get: (field: string) => row.data[field],
    };
  }

  private deletePath(refPath: string): void {
    this.deletedPaths.push(refPath);
    const slash = refPath.lastIndexOf("/");
    const collectionPath = refPath.slice(0, slash);
    const id = refPath.slice(slash + 1);
    this.rows.set(
      collectionPath,
      (this.rows.get(collectionPath) ?? []).filter((row) => row.id !== id)
    );
  }
}

let db: FakeFirestore;

beforeEach(() => {
  vi.clearAllMocks();
  db = new FakeFirestore();
  firestoreMock.mockReturnValue(db);
});

describe("AI-output deletion lifecycle", () => {
  it("deletes persisted issue and assistant output with a scan", async () => {
    db.seed("workspaces/ws-1/aiExplanations", [
      { id: "issue-1_react", data: { scanJobId: "scan-1" } },
      { id: "issue-2_react", data: { scanJobId: "scan-2" } },
    ]);
    db.seed("workspaces/ws-1/aiAssistantResults", [
      { id: "scan-1", data: { scanJobId: "scan-1" } },
      { id: "scan-2", data: { scanJobId: "scan-2" } },
    ]);

    const counts = await deleteScanCompletely("ws-1", "scan-1");

    expect(counts.aiExplanations).toBe(1);
    expect(counts.aiAssistantResults).toBe(1);
    expect(db.deletedPaths).toEqual(
      expect.arrayContaining([
        "workspaces/ws-1/aiExplanations/issue-1_react",
        "workspaces/ws-1/aiAssistantResults/scan-1",
      ])
    );
    expect(db.rows.get("workspaces/ws-1/aiExplanations")).toHaveLength(1);
    expect(db.rows.get("workspaces/ws-1/aiAssistantResults")).toHaveLength(1);
  });

  it("sweeps orphaned AI output during whole-workspace deletion", async () => {
    db.seed("workspaces/ws-1/aiExplanations", [
      { id: "orphan-issue_react", data: { scanJobId: "missing-scan" } },
    ]);
    db.seed("workspaces/ws-1/aiAssistantResults", [
      { id: "missing-scan", data: { scanJobId: "missing-scan" } },
    ]);

    const counts = await deleteWorkspaceScanData("ws-1");

    expect(counts.aiExplanations).toBe(1);
    expect(counts.aiAssistantResults).toBe(1);
    expect(db.rows.get("workspaces/ws-1/aiExplanations")).toEqual([]);
    expect(db.rows.get("workspaces/ws-1/aiAssistantResults")).toEqual([]);
  });
});
