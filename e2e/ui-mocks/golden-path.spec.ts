import { test, expect } from "@playwright/test";

/**
 * Golden-path coverage: start scan → completion → dashboard → issue
 * detail → export.
 *
 * The full journey needs seeded Firestore data, the polling browser worker,
 * and an authenticated Firebase session. The e2e lane here boots `next dev`
 * without live provider credentials, so authenticated steps can't run in CI
 * today (see e2e/authenticated for the staging lane). The bulk of this path
 * is covered by unit/integration tests instead:
 *
 *   - scan creation + caps        → src/app/api/scans/route.test.ts
 *   - normalize / dedup / score   → src/lib/scanner/{normalize,scoring}.test.ts
 *   - root-cause grouping         → src/lib/scanner/grouping.test.ts
 *   - before/after comparison     → src/lib/scanner/compare.test.ts
 *   - report HTML/CSV/JSON export → src/lib/reports/render.test.ts
 *   - prod no-fallback regression → src/lib/scanner/inline-runner.test.ts
 *   - viewport coverage           → src/lib/scanner/viewports.test.ts
 *
 * This spec activates once a test sign-in route + seed exist. Set
 * E2E_APP_AUTH=1 (and provide storageState) to run it locally.
 */
const APP_AUTH = process.env.E2E_APP_AUTH === "1";

test.describe("golden path: scan → results → export", () => {
  test.skip(!APP_AUTH, "requires seeded DB + worker + authenticated session");

  test("a user can start a scan and reach the results dashboard", async ({ page }) => {
    await page.goto("/app/scans/new");
    await page.getByLabel(/url/i).fill("https://kalandar-tur.vercel.app/");
    await page.getByRole("button", { name: /start scan/i }).click();

    // Progress page polls until completion, then the results render.
    await expect(page).toHaveURL(/\/app\/scans\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { name: /scan results/i })).toBeVisible({
      timeout: 120_000,
    });
  });

  test("an issue card opens and an export downloads", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("link", { name: /view results|scan results/i }).first().click();
    await page.getByRole("link", { name: /view detail|issue/i }).first().click();
    await expect(page.getByText(/visual evidence/i)).toBeVisible();
  });
});
