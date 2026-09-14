/**
 * Contract: every RSC page that reads workspace data declares a permission.
 *
 * The API routes are gated (see src/lib/api/route-permissions.test.ts), but
 * pages under /app read Firestore directly in the server component. Gating the
 * API alone does not close the hole: a report_viewer denied by
 * /api/scans/:id/issues could still navigate to /app/scans/:id and get the
 * findings rendered into the HTML.
 *
 * getCurrentWorkspaceOrRedirect() proves session + membership only.
 * requirePagePermission() adds the role check. Pages that legitimately need no
 * role check are allowlisted individually, with a reason.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP_ROOT = join(process.cwd(), "src", "app", "app");

const NO_ROLE_CHECK_REQUIRED: Record<string, string> = {
  "layout.tsx":
    "shell chrome; establishes the session but renders no workspace findings",
  "settings/page.tsx":
    "workspace name/region only, and it derives its own owner/admin edit flag",
  "settings/profile/page.tsx": "the caller's own profile",
  "no-access/page.tsx":
    "the denial destination itself — gating it would loop for a role with no permissions",
};

function pageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pageFiles(full));
    else if (entry === "page.tsx" || entry === "layout.tsx") out.push(full);
  }
  return out;
}

const id = (file: string) => relative(APP_ROOT, file).split(sep).join("/");

describe("RSC page permission contract", () => {
  const files = pageFiles(APP_ROOT);

  it("finds the app pages", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("gates every page that loads workspace data", () => {
    const unguarded = files
      .filter((file) => {
        const src = readFileSync(file, "utf8");
        // Client components and static pages never touch Firestore server-side.
        if (!/\bgetCurrentWorkspaceOrRedirect\b/.test(src)) return false;
        if (id(file) in NO_ROLE_CHECK_REQUIRED) return false;
        return !/\brequirePagePermission\b/.test(src);
      })
      .map(id);

    expect(
      unguarded,
      `These pages read workspace data with no role check. Use ` +
        `requirePagePermission(...), or add the page to NO_ROLE_CHECK_REQUIRED ` +
        `with a reason:\n  ${unguarded.join("\n  ")}`
    ).toEqual([]);
  });

  it("keeps the allowlist honest — every entry must still exist", () => {
    for (const [entry, reason] of Object.entries(NO_ROLE_CHECK_REQUIRED)) {
      const src = readFileSync(join(APP_ROOT, ...entry.split("/")), "utf8");
      expect(reason.length, `${entry} needs a reason`).toBeGreaterThan(10);
      expect(
        /\bgetCurrentWorkspaceOrRedirect\b/.test(src),
        `${entry} no longer loads workspace data — drop it from the allowlist`
      ).toBe(true);
    }
  });
});
