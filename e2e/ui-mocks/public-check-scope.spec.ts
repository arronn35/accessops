/**
 * F18: the instant check's verdict must not read as more certain than its scope.
 *
 * The engine only parses the first HTML response, so a perfect score means
 * "nothing found in one document", not "this site is accessible". The API
 * already reports its own limitations; the UI has to show them rather than
 * substituting a shorter claim of its own.
 *
 * Routed through page.route so this never spends a real public-check quota.
 */
import { expect, test } from "@playwright/test";

const LIMITATIONS = [
  "This preview checks the initial HTML response only; it does not run JavaScript or test interactive states.",
  "Automated checks cannot establish WCAG, ADA, EAA, or legal compliance.",
  "Sign in for the full browser scan across desktop, tablet, mobile, and interactive states.",
];

function payload(over: Record<string, unknown> = {}) {
  return {
    url: "https://example.com/",
    title: "Example",
    score: 100,
    grade: "A",
    riskLevel: "low",
    issueCounts: { critical: 0, serious: 0, moderate: 0, minor: 0, review: 0 },
    wcagIssueCount: 0,
    bestPracticeIssueCount: 0,
    manualReviewCount: 0,
    topFindings: [],
    durationMs: 120,
    engine: "static-html-preview",
    confidence: "low",
    persisted: false,
    limitations: LIMITATIONS,
    ...over,
  };
}

async function runCheck(page: import("@playwright/test").Page, body: object, resultLabel = "Instant check result") {
  await page.route("**/api/public-check", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  );
  await page.goto("/");
  const input = page.locator('input[type="url"], input[name="url"]').first();
  await input.fill("https://example.com");
  await input.press("Enter");
  const section = page.locator(`section[aria-label="${resultLabel}"]`);
  await section.waitFor();
  return section;
}

test.describe("instant check scope", () => {
  test("a perfect score is framed as scope, not as a clean site", async ({ page }) => {
    const section = await runCheck(page, payload());
    const text = await section.innerText();

    expect(text).toContain("No issues found in the first HTML response");
    expect(text).toContain("not the same as an accessible site");
    // The scope qualifier sits with the number, not only in fine print.
    expect(text.toLowerCase()).toContain("html only");
  });

  test("every limitation the API reports is shown", async ({ page }) => {
    const section = await runCheck(page, payload());
    const text = await section.innerText();

    for (const limitation of LIMITATIONS) {
      expect(text).toContain(limitation);
    }
  });

  test("a scan with findings still reports the counts", async ({ page }) => {
    const section = await runCheck(
      page,
      payload({
        score: 61,
        grade: "D",
        issueCounts: { critical: 2, serious: 1, moderate: 0, minor: 0, review: 3 },
      })
    );
    const text = await section.innerText();

    expect(text).toContain("6 preliminary findings");
    expect(text).toContain("2 critical");
    expect(text).not.toContain("No issues found");
  });

  test("a Turkish verdict renders without hydration errors (React #418)", async ({
    context,
    page,
  }) => {
    // The form re-renders on every keystroke and status change; translated
    // labels used to diverge from React's virtual DOM and throw minified
    // #418 on submit.
    await context.addCookies([
      {
        name: "percevia_locale",
        value: "tr",
        domain: "127.0.0.1",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));

    const section = await runCheck(page, payload(), "Anlık kontrol sonucu");
    const text = await section.innerText();

    expect(text).toContain("İlk HTML yanıtında sorun bulunamadı");
    expect(errors.join("\n")).not.toMatch(/418/);
  });
});
