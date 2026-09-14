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
    await expect(page.getByText(/Export JSON/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Delete/i }).first()).toBeVisible();
  });

  test("signing out clears the session", async ({ page }) => {
    const res = await page.request.delete("/api/auth/session");
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

    // Capture the immutable scan id, then assert the stored engine result.
    // A static fallback or a stray "completed" label must not satisfy this test.
    // Progress page: queued → running → … → completed, then results render.
    await expect(page).toHaveURL(/\/app\/scans\//, { timeout: 15_000 });
    const scanId = new URL(page.url()).pathname.split("/")[3];
    expect(scanId).toBeTruthy();
    await expect.poll(async () => {
      const response = await page.request.get(`/api/scans/${scanId}`);
      if (!response.ok()) return response.status();
      return (await response.json()).scan.status;
    }, { timeout: 4 * 60_000, intervals: [1000, 2000, 5000] }).toBe("completed");
    const scanResponse = await page.request.get(`/api/scans/${scanId}`);
    const result = await scanResponse.json();
    expect(result.scan.comparisonProfile.completeMetadata).toBe(true);
    expect(result.scan.comparisonProfile.engineVersions.join(" ")).toContain("playwright-axe");
    expect(result.scoreSummary).toBeTruthy();
    await page.goto(`/app/scans/${scanId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Remove only the scan created by this test.
    const deleted = await page.request.delete(`/api/scans/${scanId}`);
    expect(deleted.ok()).toBe(true);
  });
});
