import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/legal/terms", h1: /Terms of Service/i },
  { path: "/legal/privacy", h1: /Privacy Policy/i },
  { path: "/legal/dpa", h1: /Data Processing Addendum/i },
  { path: "/legal/subprocessors", h1: /Subprocessors/i },
  { path: "/legal/contact", h1: /^Contact$/i },
];

test.describe("legal pages", () => {
  for (const p of PAGES) {
    test(`${p.path} renders the right heading`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.getByRole("heading", { name: p.h1, level: 1 })).toBeVisible();
    });
  }

  test("legal sidebar links to every sibling", async ({ page }) => {
    await page.goto("/legal/terms");
    const sidebar = page.getByRole("complementary").or(page.locator("aside"));
    for (const label of [
      "Terms of Service",
      "Privacy Policy",
      "Data Processing Addendum",
      "Subprocessors",
      "Contact",
    ]) {
      await expect(sidebar.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("subprocessor list includes Stripe", async ({ page }) => {
    await page.goto("/legal/subprocessors");
    await expect(page.getByText(/Stripe, Inc\./)).toBeVisible();
  });
});
