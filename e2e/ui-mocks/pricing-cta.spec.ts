import { test, expect } from "@playwright/test";

/**
 * Paid plans first request a Polar checkout. When billing is unavailable
 * (local/demo), the client deliberately falls back to /api/plan/select.
 * Mock both calls so the suite reflects the production contract.
 */
test.describe("pricing CTA → plan-select API", () => {
  test("activates the plan and redirects to billing page", async ({ page }) => {
    await page.route("**/api/billing/checkout", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "billing_unavailable" }),
      })
    );
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

  test("surfaces a friendly error on failure", async ({ page }) => {
    await page.route("**/api/billing/checkout", (route) =>
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

  test("does not throw hydration errors in Turkish (React #418)", async ({
    context,
    page,
  }) => {
    // The CTA re-renders on click (idle → busy → redirect). Before the
    // React-state i18n migration, the DOM-mutating translator had rewritten
    // its label behind React's back and this click threw minified #418.
    await context.addCookies([
      {
        name: "percevia_locale",
        value: "tr",
        domain: "127.0.0.1",
        path: "/",
        sameSite: "Lax",
      },
    ]);
    await page.route("**/api/billing/checkout", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "unauthorized" }),
      })
    );

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    await page.goto("/pricing");
    await page.getByRole("button", { name: /Hemen başla/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/sign-in\?callbackUrl=/);
    expect(errors.join("\n")).not.toMatch(/418/);
  });
});
