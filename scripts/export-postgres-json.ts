import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "migration-export.json";
const DATABASE_URL = process.env.DATABASE_URL;

const TABLES = [
  "users",
  "workspaces",
  "workspace_members",
  "privacy_settings",
  "usage_limits",
  "scan_jobs",
  "scan_pages",
  "accessibility_issues",
  "issue_groups",
  "scan_summaries",
  "reports",
  "audit_logs",
  "workspace_invitations",
];

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required for the one-time Postgres export.");
  process.exit(1);
}
const databaseUrl = DATABASE_URL;

function queryJson(sql: string): unknown {
  const stdout = execFileSync("psql", [databaseUrl, "-At", "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
  return stdout ? JSON.parse(stdout) : [];
}

function tableExists(table: string): boolean {
  const result = queryJson(
    `select json_agg(to_regclass('public.${table}') is not null);`
  ) as boolean[];
  return Boolean(result[0]);
}

const exported: Record<string, unknown> = {
  exportedAt: new Date().toISOString(),
  source: "postgres",
  tables: {},
};

for (const table of TABLES) {
  if (!tableExists(table)) {
    (exported.tables as Record<string, unknown[]>)[table] = [];
    continue;
  }
  (exported.tables as Record<string, unknown[]>)[table] = queryJson(
    `select coalesce(json_agg(row_to_json(t)), '[]'::json) from (select * from public.${table}) t;`
  ) as unknown[];
}

writeFileSync(OUT, `${JSON.stringify(exported, null, 2)}\n`, "utf8");
console.log(`Exported ${TABLES.length} tables to ${OUT}`);
