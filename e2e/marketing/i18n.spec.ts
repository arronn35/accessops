import { expect, test } from "@playwright/test";

test.describe("interface language", () => {
  test("uses English by default", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Accessibility operations", { exact: true })).toBeVisible();
  });

  test("applies the persisted Turkish preference across public pages", async ({ context, page }) => {
    await context.addCookies([
      {
        name: "percevia_locale",
        value: "tr",
        domain: "127.0.0.1",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByText("Erişilebilirlik operasyonları", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ücretsiz tarama başlat" }).first()).toBeVisible();
    await expect(page.getByText("WCAG 2.2 AA", { exact: true }).first()).toBeVisible();
  });
});
