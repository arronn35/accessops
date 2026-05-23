import { test, expect } from "@playwright/test";

/**
 * The pricing CTAs for paid plans are client components that POST to
 * /api/billing/checkout. In production that route requires a session and
 * returns a Stripe Checkout URL. We mock both flavours of response here
 * to lock in the CTA behaviour without needing Stripe or auth.
 */
test.describe("pricing CTA → checkout API", () => {
  test("redirects to Stripe Checkout on success", async ({ page }) => {
    await page.route("**/api/billing/checkout", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.example/test_session" }),
      })
    );

    await page.goto("/pricing");
    // Don't actually load Stripe — capture the navigation attempt.
    const navPromise = page.waitForRequest(
      (req) => req.url().startsWith("https://checkout.example/")
    );
    await page.getByRole("button", { name: /Get started/i }).first().click();
    const req = await navPromise;
    expect(req.url()).toBe("https://checkout.example/test_session");
  });

  test("bounces unauthenticated user to sign-in", async ({ page }) => {
    await page.route("**/api/billing/checkout", (route) =>
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

  test("surfaces a friendly error when Stripe is not configured", async ({ page }) => {
    await page.route("**/api/billing/checkout", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "billing_unavailable",
          message: "Stripe is not configured on this deployment.",
        }),
      })
    );

    await page.goto("/pricing");
    await page.getByRole("button", { name: /Get started/i }).first().click();
    await expect(page.getByText(/Stripe is not configured/i)).toBeVisible();
  });
});
