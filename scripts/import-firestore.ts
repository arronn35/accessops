import { readFileSync } from "node:fs";
import { firebaseAdminAuth, firestore } from "../src/lib/firebase/admin";

interface MigrationExport {
  tables?: Record<string, Array<Record<string, unknown>>>;
}

const inputPath = process.argv[2] ?? "migration-export.json";
const input = JSON.parse(readFileSync(inputPath, "utf8")) as MigrationExport;
const tables = input.tables ?? {};
const db = firestore();
const auth = firebaseAdminAuth();
const scanWorkspaceIds = new Map<string, string>();

const ROOT_TABLES: Record<string, string> = {
  users: "users",
  workspaces: "workspaces",
  workspace_invitations: "workspaceInvitations",
  audit_logs: "auditLogs",
};

const SUBCOLLECTIONS: Record<
  string,
  { root: string; child: string; workspaceField: string }
> = {
  workspace_members: { root: "workspaces", child: "members", workspaceField: "workspaceId" },
  privacy_settings: { root: "workspaces", child: "privacy", workspaceField: "workspaceId" },
  usage_limits: { root: "workspaces", child: "usage", workspaceField: "workspaceId" },
  scan_jobs: { root: "workspaces", child: "scans", workspaceField: "workspaceId" },
  reports: { root: "workspaces", child: "reports", workspaceField: "workspaceId" },
};

const SCAN_SUBCOLLECTIONS: Record<string, string> = {
  scan_pages: "pages",
  accessibility_issues: "issues",
  issue_groups: "groups",
  scan_summaries: "summaries",
};

function camelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [camelKey(k), normalize(v)])
    );
  }
  return value;
}

function idOf(row: Record<string, unknown>, fallback: string): string {
  return String(row.id ?? row.uid ?? row.token ?? fallback);
}

async function setDoc(path: string, id: string, row: Record<string, unknown>) {
  await db.collection(path).doc(id).set(normalize(row) as Record<string, unknown>, {
    merge: true,
  });
}

async function importUsers(rows: Array<Record<string, unknown>>) {
  for (const row of rows) {
    const uid = idOf(row, crypto.randomUUID());
    const email = typeof row.email === "string" ? row.email : undefined;
    if (email) {
      try {
        await auth.createUser({
          uid,
          email,
          emailVerified: Boolean(row.email_verified ?? row.emailVerified),
          displayName: typeof row.name === "string" ? row.name : undefined,
          photoURL: typeof row.image === "string" ? row.image : undefined,
        });
      } catch (err) {
        if ((err as { code?: string }).code !== "auth/uid-already-exists") throw err;
      }
    }
    await setDoc("users", uid, { ...row, id: uid });
  }
}

async function main() {
  for (const row of tables.scan_jobs ?? []) {
    const scanId = String(row.id ?? "");
    const workspaceId = String(row.workspaceId ?? row.workspace_id ?? "");
    if (scanId && workspaceId) scanWorkspaceIds.set(scanId, workspaceId);
  }

  await importUsers(tables.users ?? []);

  for (const [table, collection] of Object.entries(ROOT_TABLES)) {
    if (table === "users") continue;
    for (const row of tables[table] ?? []) {
      await setDoc(collection, idOf(row, crypto.randomUUID()), row);
    }
  }

  for (const [table, cfg] of Object.entries(SUBCOLLECTIONS)) {
    for (const row of tables[table] ?? []) {
      const workspaceId = String(row[cfg.workspaceField] ?? row.workspace_id ?? "");
      if (!workspaceId) continue;
      await setDoc(
        `${cfg.root}/${workspaceId}/${cfg.child}`,
        idOf(row, table === "privacy_settings" ? "settings" : "current"),
        row
      );
    }
  }

  for (const [table, child] of Object.entries(SCAN_SUBCOLLECTIONS)) {
    for (const row of tables[table] ?? []) {
      const scanId = String(row.scanJobId ?? row.scan_job_id ?? "");
      const workspaceId = String(
        row.workspaceId ?? row.workspace_id ?? scanWorkspaceIds.get(scanId) ?? ""
      );
      if (!workspaceId || !scanId) continue;
      await setDoc(
        `workspaces/${workspaceId}/scans/${scanId}/${child}`,
        idOf(row, child === "summaries" ? "summary" : crypto.randomUUID()),
        row
      );
    }
  }

  console.log(`Imported Firestore data from ${inputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
