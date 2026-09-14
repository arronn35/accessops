import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
const outputDirectory = "output/verification";

interface RouteCheck {
  path: string;
  expectedText: string;
  screenshot: string;
}

interface ResponsiveViewport {
  label: string;
  width: number;
  height: number;
  mobile?: boolean;
  deviceScaleFactor?: number;
}

const routes: RouteCheck[] = [
  { path: "/", expectedText: "Find accessibility issues", screenshot: "home-desktop.png" },
  { path: "/solutions/agencies", expectedText: "Ship useful accessibility audits", screenshot: "agencies-desktop.png" },
  { path: "/solutions/turkiye", expectedText: "Erişilebilirlik bulgularını", screenshot: "turkiye-desktop.png" },
  { path: "/sample-report", expectedText: "Synthetic sample", screenshot: "sample-report-desktop.png" },
  { path: "/pricing", expectedText: "All current Percevia AI features", screenshot: "pricing-desktop.png" },
];

const responsiveViewports: ResponsiveViewport[] = [
  { label: "iphone-se", width: 320, height: 568, mobile: true, deviceScaleFactor: 2 },
  { label: "android-compact", width: 360, height: 800, mobile: true, deviceScaleFactor: 3 },
  { label: "iphone-modern", width: 390, height: 844, mobile: true, deviceScaleFactor: 3 },
  { label: "tablet-portrait", width: 768, height: 1024, mobile: true, deviceScaleFactor: 2 },
  { label: "windows-laptop", width: 1366, height: 768 },
  { label: "macbook", width: 1440, height: 900, deviceScaleFactor: 2 },
  { label: "full-hd", width: 1920, height: 1080 },
  { label: "qhd", width: 2560, height: 1440 },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function checkRoute(page: Page, check: RouteCheck) {
  const consoleErrors: string[] = [];
  const onConsole = (message: { type(): string; text(): string }) => {
    const text = message.text();
    const isDevHmrHandshake = text.includes("/_next/webpack-hmr") && text.includes("ERR_INVALID_HTTP_RESPONSE");
    if (message.type() === "error" && !isDevHmrHandshake) consoleErrors.push(text);
  };
  page.on("console", onConsole);
  const response = await page.goto(`${baseUrl}${check.path}`, { waitUntil: "load", timeout: 180_000 });
  assert(response?.ok(), `${check.path} returned ${response?.status() ?? "no response"}`);
  assert((await page.locator("body").innerText()).includes(check.expectedText), `${check.path} is missing expected content`);
  assert(await page.locator("[data-nextjs-dialog]").count() === 0, `${check.path} has a Next.js error overlay`);
  assert(consoleErrors.length === 0, `${check.path} console errors: ${consoleErrors.join(" | ")}`);
  await page.screenshot({ path: `${outputDirectory}/${check.screenshot}`, fullPage: true });
  page.off("console", onConsole);
}

async function checkResponsiveRoute(page: Page, check: RouteCheck, viewport: ResponsiveViewport) {
  const response = await page.goto(`${baseUrl}${check.path}`, { waitUntil: "load", timeout: 180_000 });
  assert(response?.ok(), `${viewport.label} ${check.path} returned ${response?.status() ?? "no response"}`);
  assert((await page.locator("body").innerText()).includes(check.expectedText), `${viewport.label} ${check.path} is missing expected content`);
  assert(await page.locator("[data-nextjs-dialog]").count() === 0, `${viewport.label} ${check.path} has a Next.js error overlay`);

  const dimensions = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>("[data-marketing-shell]");
    const shellRect = shell?.getBoundingClientRect();
    const header = document.querySelector<HTMLElement>("header");
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      shellLeft: shellRect?.left ?? null,
      shellRight: shellRect?.right ?? null,
      shellWidth: shellRect?.width ?? null,
      headerClientWidth: header?.clientWidth ?? null,
      headerScrollWidth: header?.scrollWidth ?? null,
    };
  });

  assert(
    dimensions.documentWidth <= dimensions.viewportWidth + 1
      && dimensions.bodyWidth <= dimensions.viewportWidth + 1,
    `${viewport.label} ${check.path} overflows horizontally: ${JSON.stringify(dimensions)}`
  );
  assert(
    dimensions.shellLeft !== null
      && dimensions.shellRight !== null
      && dimensions.shellWidth !== null
      && dimensions.shellLeft <= 1
      && dimensions.shellRight >= dimensions.viewportWidth - 1
      && dimensions.shellWidth >= dimensions.viewportWidth - 2,
    `${viewport.label} ${check.path} does not fill the viewport: ${JSON.stringify(dimensions)}`
  );
  assert(
    dimensions.headerClientWidth !== null
      && dimensions.headerScrollWidth !== null
      && dimensions.headerScrollWidth <= dimensions.headerClientWidth + 1,
    `${viewport.label} ${check.path} header overflows: ${JSON.stringify(dimensions)}`
  );
}

async function main() {
  console.log(`Starting browser verification against ${baseUrl}`);
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    desktop.setDefaultTimeout(30_000);
    desktop.setDefaultNavigationTimeout(180_000);
    for (const route of routes) await checkRoute(desktop, route);

    await desktop.route("**/api/public-check", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://example.com/checkout",
          title: "Checkout",
          score: 72,
          grade: "C",
          issueCounts: { critical: 1, serious: 1, moderate: 0, minor: 0, review: 1 },
          wcagIssueCount: 2,
          topFindings: [{ ruleId: "button-name", impact: "critical", help: "Buttons must have discernible text" }],
          limitations: [],
        }),
      });
    });
    await desktop.goto(baseUrl, { waitUntil: "load", timeout: 180_000 });
    const publicUrlInput = desktop.getByRole("textbox", { name: /Check one public page/i });
    await publicUrlInput.click();
    await publicUrlInput.pressSequentially("https://example.com/checkout", { delay: 5 });
    const checkButton = desktop.getByRole("button", { name: /Check page/i });
    await checkButton.waitFor({ state: "visible" });
    assert(!(await checkButton.isDisabled()), "Public check button did not react to URL input");
    await checkButton.click();
    const fullScanLink = desktop.getByRole("link", { name: /Run the full scan/i });
    await fullScanLink.waitFor();
    assert(
      (await fullScanLink.getAttribute("href")) === "/onboarding?url=https%3A%2F%2Fexample.com%2Fcheckout",
      "Public check did not preserve the URL for onboarding"
    );

    const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await mobile.goto(`${baseUrl}/solutions/turkiye`, { waitUntil: "load", timeout: 180_000 });
    assert((await mobile.locator("body").innerText()).includes("Sentetik pilot açıklaması"), "Mobile Turkish synthetic disclosure is missing");
    await mobile.screenshot({ path: `${outputDirectory}/turkiye-mobile.png`, fullPage: true });

    for (const viewport of responsiveViewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        isMobile: viewport.mobile ?? false,
        hasTouch: viewport.mobile ?? false,
      });
      const responsivePage = await context.newPage();
      responsivePage.setDefaultTimeout(30_000);
      responsivePage.setDefaultNavigationTimeout(180_000);
      for (const route of routes) await checkResponsiveRoute(responsivePage, route, viewport);
      await responsivePage.goto(baseUrl, { waitUntil: "load", timeout: 180_000 });
      await responsivePage.screenshot({
        path: `${outputDirectory}/home-${viewport.label}.png`,
        fullPage: true,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(
    `Verified ${routes.length} routes, URL handoff, and ${responsiveViewports.length} responsive viewport profiles.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
