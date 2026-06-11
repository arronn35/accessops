import { test, expect } from "@playwright/test";

/**
 * The pricing CTAs for paid plans are client components that POST to
 * /api/plan/select. Stripe was removed; selecting a plan now grants
 * access immediately. We mock the API to lock in the CTA behaviour
 * without needing auth.
 */
test.describe("pricing CTA → plan-select API", () => {
  test("activates the plan and redirects to billing page", async ({ page }) => {
    await page.route("**/api/plan/select", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, plan: "starter" }),
      })
    );

    await page.goto("/pricing");
    await page.getByRole("button", { name: /Get started/i }).first().click();
    await expect(page.getByRole("button", { name: /Plan activated/i })).toBeVisible();
  });

  test("bounces unauthenticated user to sign-in", async ({ page }) => {
    await page.route("**/api/plan/select", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "unauthorized" }),
      })
    );

    await page.goto("/pricing");
    await page.getByRole("button", { name: /Get started/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/sign-in\?callbackUrl=/);
  });

  test("surfaces a friendly error on failure", async ({ page }) => {
    await page.route("**/api/plan/select", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "internal",
          message: "Something went wrong.",
        }),
      })
    );

    await page.goto("/pricing");
    await page.getByRole("button", { name: /Get started/i }).first().click();
    await expect(page.getByText(/Something went wrong/i)).toBeVisible();
  });
});
