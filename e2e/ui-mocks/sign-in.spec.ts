import { test, expect } from "@playwright/test";

/**
 * Sign-in page is public. We don't actually exchange a Firebase email link in
 * CI; we verify the public form contract and legal links stay intact.
 */
test.describe("sign-in form", () => {
  test("renders email input and legal links", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(
      page.getByRole("heading", { name: /Sign in to Percevia AI/i })
    ).toBeVisible();

    // Either a Firebase-backed form is shown, or a warning callout. Both
    // are acceptable in CI depending on env.
    const emailField = page.getByLabel(/Email address/i);
    const notConfigured = page.getByText(/Email sign-in not configured/i);
    await expect(emailField.or(notConfigured)).toBeVisible();

    await expect(page.getByRole("link", { name: /Terms/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Privacy Policy/i })).toBeVisible();
  });

  test("carries callbackUrl through the form", async ({ page }) => {
    await page.goto("/auth/sign-in?callbackUrl=/app/settings/billing");
    const hidden = page.locator('input[name="callbackUrl"]').first();
    // Either the form is shown (hidden input exists) or a notice is shown
    // because Firebase is unconfigured. We only assert when the form renders.
    if (await hidden.count()) {
      await expect(hidden).toHaveValue("/app/settings/billing");
    }
  });
});
