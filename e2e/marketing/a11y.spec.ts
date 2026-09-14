/**
 * Accessibility regressions that were found by scanning the product's own
 * pages. Each assertion here corresponds to a defect that shipped, so these
 * are gates rather than aspirations:
 *
 *   - Report code chips rendered at 4.32:1 on their #F7F8FB background. They
 *     cleared 4.5:1 on plain white, which is why review missed it.
 *   - Legal prose links were distinguished from body text by colour alone
 *     (1.76:1 against surrounding text), with underline only on hover.
 *   - The landing page overflowed its viewport by 6px at 320px, because grid
 *     children default to min-width:auto and refused to shrink.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LEGAL_PAGES = [
  "/legal/terms",
  "/legal/privacy",
  "/legal/dpa",
  "/legal/subprocessors",
  "/legal/contact",
  "/legal/ai-use",
  "/legal/no-legal-advice",
  "/legal/accessibility-methodology",
];

test.describe("accessibility gates", () => {
  for (const path of LEGAL_PAGES) {
    test(`${path} distinguishes in-text links without relying on colour`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withRules(["link-in-text-block", "color-contrast"])
        .analyze();

      expect(
        results.violations.map((v) => `${v.id} (${v.nodes.length} nodes)`)
      ).toEqual([]);
    });
  }

  test("the sample report meets contrast, including inside its iframe", async ({ page }) => {
    await page.goto("/sample-report");
    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(" ")))
    ).toEqual([]);
  });

  test("the landing page does not overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/");

    const { viewport, bodyScrollWidth, docScrollWidth } = await page.evaluate(() => ({
      viewport: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
    }));

    // overflow-x-clip can hide the scrollbar while content still overflows,
    // so assert on scrollWidth rather than on whether the page scrolls.
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewport);
    expect(docScrollWidth).toBeLessThanOrEqual(viewport);
  });

  // F16: the header's primary links are hidden below lg. Without a menu, the
  // only route to pricing on a phone was ~14 screens of scrolling on a 20,000px
  // landing page, or the footer.
  test("primary navigation is reachable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Menu" });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = page.getByRole("navigation", { name: "Primary (mobile)" });
    await expect(menu.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "How it works" })).toBeVisible();

    await menu.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(/\/pricing$/);
  });

  test("the mobile menu can be escaped from the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Menu" });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Focus must come back, or a keyboard user is stranded at the page start.
    await expect(trigger).toBeFocused();
  });

  test("the menu is desktop-hidden, where the inline links already show", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Pricing" })
    ).toBeVisible();
  });

  test("the phone landing page has no automatic accessibility violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const results = await new AxeBuilder({ page }).analyze();

    expect(
      results.violations.map((v) => `${v.id} (${v.nodes.length})`)
    ).toEqual([]);
  });
});
