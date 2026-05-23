import { test, expect } from "@playwright/test";

/**
 * Smoke coverage for the public landing page. Catches:
 *   - blank/500 hero (e.g. missing fonts, missing brand asset)
 *   - broken nav links (Pricing, How it works anchor)
 *   - missing footer legal links (regression on Task #2)
 *   - missing no-overlay / no-compliance messaging
 */
test.describe("landing page", () => {
  test("renders hero, trust strip, and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/maitrico AccessOps AI/);
    await expect(
      page.getByRole("heading", {
        name: /Find accessibility issues before they become user and compliance problems/i,
      })
    ).toBeVisible();
    // Two distinct hero CTAs.
    await expect(page.getByRole("link", { name: /Start free scan/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /See how it works/i })).toBeVisible();
  });

  test("primary nav routes to pricing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^Pricing$/ }).first().click();
    await expect(page).toHaveURL(/\/pricing$/);
  });

  test("footer links every legal page", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").last();
    for (const label of ["Terms", "Privacy", "DPA", "Subprocessors", "Contact"]) {
      await expect(footer.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("never claims legal compliance", async ({ page }) => {
    await page.goto("/");
    const body = await page.textContent("body");
    // Sanity: forbidden marketing claims must not appear in the page chrome.
    for (const banned of [
      "100% compliant",
      "fully compliant",
      "guaranteed compliance",
      "legally compliant",
      "WCAG certified",
    ]) {
      expect(body?.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});
