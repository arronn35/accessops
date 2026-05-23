import { test, expect } from "@playwright/test";

test.describe("pricing page", () => {
  test("lists all five plans", async ({ page }) => {
    await page.goto("/pricing");
    for (const name of ["Free", "Starter", "Agency", "Team", "Enterprise"]) {
      await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    }
  });

  test("Free CTA routes to onboarding", async ({ page }) => {
    await page.goto("/pricing");
    // The free card's "Start free" anchor — the public CTA component
    // renders an <a href="/onboarding"> for `planId === "free"`.
    const freeLink = page.getByRole("link", { name: /Start free/ }).first();
    await expect(freeLink).toHaveAttribute("href", "/onboarding");
  });

  test("Enterprise CTA opens a mailto", async ({ page }) => {
    await page.goto("/pricing");
    const link = page.getByRole("link", { name: /Contact sales/ });
    await expect(link).toHaveAttribute("href", /^mailto:sales@maitrico\.com/);
  });

  test("footer routes to legal docs", async ({ page }) => {
    await page.goto("/pricing");
    const footer = page.locator("footer").last();
    await footer.getByRole("link", { name: "Terms" }).click();
    await expect(page).toHaveURL(/\/legal\/terms$/);
  });
});
