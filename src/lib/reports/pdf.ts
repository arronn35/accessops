import "server-only";

/**
 * Server-side PDF renderer for report exports.
 *
 * Two engines, chosen at runtime:
 *   1. Full Playwright Chromium — local dev, CI with `playwright install`,
 *      and the Cloud Run worker image. Used first wherever it launches.
 *   2. Serverless Chromium (`@sparticuz/chromium` + `playwright-core`) —
 *      Vercel/λ functions ship no browser binaries, so the full build's
 *      `launch()` fails there with "Executable doesn't exist". The
 *      serverless build downloads/extracts to /tmp on first use.
 *
 * Both render the same self-contained report HTML (all imagery is data URIs,
 * no external requests), so output is identical regardless of engine.
 */
const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: {
    top: "16mm",
    right: "14mm",
    bottom: "16mm",
    left: "14mm",
  },
} as const;

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  try {
    return await renderWithFullPlaywright(html);
  } catch (fullError) {
    try {
      return await renderWithServerlessChromium(html);
    } catch (serverlessError) {
      throw new Error(
        `PDF generation failed (full Chromium: ${shortError(fullError)}; ` +
          `serverless Chromium: ${shortError(serverlessError)})`
      );
    }
  }
}

async function printToPdf(
  launch: () => Promise<{ newPage: () => Promise<PrintablePage>; close: () => Promise<void> }>,
  html: string
): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({ ...PDF_OPTIONS });
  } finally {
    await browser.close();
  }
}

interface PrintablePage {
  setContent: (
    html: string,
    options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }
  ) => Promise<void>;
  pdf: (options: Record<string, unknown>) => Promise<Buffer>;
}

async function renderWithFullPlaywright(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright");
  return printToPdf(() => chromium.launch({ args: ["--no-sandbox"] }), html);
}

async function renderWithServerlessChromium(html: string): Promise<Buffer> {
  const [{ default: serverless }, { chromium }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("playwright-core"),
  ]);
  return printToPdf(
    async () =>
      chromium.launch({
        args: serverless.args,
        executablePath: await serverless.executablePath(),
      }),
    html
  );
}

function shortError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.split("\n")[0].slice(0, 220);
}
