/**
 * Contract: every session-authenticated API route declares a permission gate.
 *
 * requireSession() only proves "signed in, and scoped to this workspace" — it
 * says nothing about the caller's role. Six data routes (scan issues/compare/
 * status, report detail, and both visual-evidence surfaces) shipped on a bare
 * requireSession(), so report_viewer could read findings its role denies.
 *
 * Rather than rely on a per-route behavioural test for each surface, this
 * asserts the shape at the source level so a NEW route cannot quietly join the
 * unguarded set. Routes that legitimately need no role check are allowlisted
 * individually, with a reason.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const API_ROOT = join(process.cwd(), "src", "app", "api");

/**
 * Routes that authenticate the caller but intentionally apply no role check,
 * because the resource is scoped to the caller rather than to the workspace.
 * Keys are either whole files ("me/route.ts") or single handlers
 * ("privacy/settings/route.ts#GET") — handler scoping keeps a guarded PATCH
 * in the same file from masking an unguarded GET and vice versa.
 */
const NO_ROLE_CHECK_REQUIRED: Record<string, string> = {
  "me/route.ts": "reads/updates the caller's own profile",
  "notifications/route.ts": "the caller's own notification feed",
  "team/invitations/[id]/accept/route.ts":
    "accepting an invitation addressed to the caller, before a role exists",
  "privacy/settings/route.ts#GET":
    "workspace privacy configuration is visible to every active member; writes require manage_privacy in PATCH",
};

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

describe("API route permission contract", () => {
  const files = routeFiles(API_ROOT);

  it("finds the API routes", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("gates every session-authenticated handler on a permission", () => {
    const unguarded: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const id = relative(API_ROOT, file).split(sep).join("/");

      // Unauthenticated surfaces (webhooks, cron, internal, public) never call
      // requireSession and are out of scope for this contract.
      if (!/\brequireSession\b/.test(src)) continue;
      if (id in NO_ROLE_CHECK_REQUIRED) continue;
      // Handler-level check: a guarded DELETE in the same file must not mask
      // an unguarded GET. Split on exported HTTP handlers and require each
      // session-authenticated handler to carry its own permission gate.
      const chunks = src.split(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/);
      // chunks[0] is the file preamble; odd indices are handler names.
      const hasNamedHandlers = chunks.length > 1;
      if (!hasNamedHandlers) {
        if (!/\brequirePermission\b|\broleHasPermission\b/.test(src)) {
          unguarded.push(id);
        }
        continue;
      }
      for (let i = 1; i < chunks.length; i += 2) {
        const handler = chunks[i];
        const body = chunks[i + 1] ?? "";
        if (`${id}#${handler}` in NO_ROLE_CHECK_REQUIRED) continue;
        if (!/\brequireSession\b|\brequirePermission\b/.test(body)) continue;
        if (/\brequirePermission\b|\broleHasPermission\b/.test(body)) continue;
        unguarded.push(`${id}#${handler}`);
      }
    }

    expect(
      unguarded,
      `These handlers authenticate but never check a role. Use requirePermission(...), ` +
        `or add the route to NO_ROLE_CHECK_REQUIRED with a reason:\n  ${unguarded.join("\n  ")}`
    ).toEqual([]);
  });

  it("keeps the allowlist honest — every entry must still exist and be session-authed", () => {
    for (const [id, reason] of Object.entries(NO_ROLE_CHECK_REQUIRED)) {
      const [filePart, handlerPart] = id.split("#");
      const full = join(API_ROOT, ...filePart.split("/"));
      const src = readFileSync(full, "utf8");
      expect(reason.length, `${id} needs a reason`).toBeGreaterThan(10);
      expect(/\brequireSession\b/.test(src), `${id} no longer uses requireSession`).toBe(true);
      if (handlerPart) {
        expect(
          new RegExp(`export\\s+async\\s+function\\s+${handlerPart}\\b`).test(src),
          `${id} handler no longer exists`
        ).toBe(true);
      }
    }
  });

  it("requires export_reports wherever a route emits CSV", () => {
    const missing: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!/text\/csv/.test(src)) continue;
      if (!/export_reports/.test(src)) {
        missing.push(relative(API_ROOT, file).split(sep).join("/"));
      }
    }

    expect(
      missing,
      `CSV is a data export and needs the export_reports permission:\n  ${missing.join("\n  ")}`
    ).toEqual([]);
  });
});
