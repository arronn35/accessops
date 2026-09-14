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
    // Not a hero-only check: this sentence lives further down the landing page,
    // so it fails if translation stops after the fold. (It replaced an
    // assertion on a standalone "WCAG 2.2 AA" badge that the page never had —
    // the test was asserting content that did not exist, not a broken locale.)
    await expect(
      page.getByText(
        "Otomatik kontroller her WCAG ihlalini tespit edemez.",
        { exact: false }
      ).first()
    ).toBeVisible();
  });

  // F13: a visitor could land on a Turkish page but had no way to *choose*
  // Turkish, and no way to keep it through pricing and sign-in. The control
  // lived only in authenticated settings, where a visitor cannot reach it.
  test("a visitor can switch to Turkish and keep it through the journey", async ({
    context,
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.getByRole("button", { name: "Türkçe" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(
      page.getByText("Erişilebilirlik operasyonları", { exact: true })
    ).toBeVisible();

    // Server-rendered pages must come back Turkish, not flash English first.
    await page.goto("/pricing");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");

    await page.goto("/auth/sign-in");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");

    // The preference is durable, not per-tab state.
    const fresh = await context.newPage();
    await fresh.goto("/");
    await expect(fresh.locator("html")).toHaveAttribute("lang", "tr");
    await fresh.close();
  });

  test("the language control is reachable at mobile width", async ({ page }) => {
    // The primary nav links are hidden below lg; the language switch must not
    // be, since a Turkish visitor on a phone needs it most.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Türkçe" })).toBeVisible();
    await expect(page.getByRole("button", { name: "English" })).toBeVisible();
  });

  test("the language control reports its state to assistive tech", async ({ page }) => {
    await page.goto("/");
    const english = page.getByRole("button", { name: "English" });
    const turkish = page.getByRole("button", { name: "Türkçe" });

    await expect(english).toHaveAttribute("aria-pressed", "true");
    await expect(turkish).toHaveAttribute("aria-pressed", "false");

    await turkish.click();
    await expect(turkish).toHaveAttribute("aria-pressed", "true");
    await expect(english).toHaveAttribute("aria-pressed", "false");
  });
});
