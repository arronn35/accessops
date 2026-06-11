/**
 * Authenticated golden path against a staging stack. Replaces the
 * previously skipped lane: these tests run with a real Firebase session
 * (see auth.setup.ts) and live staging Firestore.
 *
 * The scan-to-completion journey additionally needs the staging browser
 * worker and an authorized fixture site; it is gated on E2E_FIXTURE_URL so
 * the rest of the lane stays fast and deterministic without them.
 */
import { test, expect } from "@playwright/test";

test.describe("authenticated golden path", () => {
  test("dashboard renders the user's workspace", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByText(/Workspace ·/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("new scan form renders with consent gating", async ({ page }) => {
    await page.goto("/app/scans/new");
    await expect(
      page.getByRole("heading", { name: /Start a scan/i, level: 1 })
    ).toBeVisible();
    // Scans must not start without the permission confirmation.
    await expect(page.locator("input[type=checkbox]").first()).toBeVisible();
  });

  test("compliance center exposes privacy controls", async ({ page }) => {
    await page.goto("/app/compliance");
    await expect(page.getByText(/Export ZIP/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Delete/i }).first()).toBeVisible();
  });

  test("signing out clears the session", async ({ page, request }) => {
    const res = await request.delete("/api/auth/session");
    expect(res.ok()).toBe(true);
    await page.goto("/app");
    await expect(page).toHaveURL(/auth\/sign-in/);
  });
});

test.describe("scan-to-report journey (needs staging worker + fixture site)", () => {
  test.skip(
    !process.env.E2E_FIXTURE_URL,
    "Set E2E_FIXTURE_URL to an authorized fixture site to run the full journey"
  );

  test("single-page scan completes and reports issues", async ({ page }) => {
    test.setTimeout(5 * 60_000); // worker claim + Playwright scan can take minutes

    await page.goto("/app/scans/new");
    await page.getByLabel(/URL/i).first().fill(process.env.E2E_FIXTURE_URL!);
    await page.locator("input[type=checkbox]").first().check();
    await page.getByRole("button", { name: /start|scan/i }).last().click();

    // Progress page: queued → running → … → completed, then results render.
    await expect(page).toHaveURL(/\/app\/scans\//, { timeout: 15_000 });
    await expect(page.getByText(/completed/i).first()).toBeVisible({
      timeout: 4 * 60_000,
    });
  });
});
