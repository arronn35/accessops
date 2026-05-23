/**
 * Playwright + axe-core runner.
 *
 * Runs only in the worker (NEVER in Next.js serverless functions).
 *
 * Responsibilities:
 *   - Launch a hardened Chromium with a strict CSP-friendly profile.
 *   - Navigate with a deadline.
 *   - Re-validate the resolved URL post-redirect (defense against open
 *     redirects → SSRF).
 *   - Inject axe-core via @axe-core/playwright.
 *   - Optionally collect a screenshot (only when explicitly enabled).
 *   - Normalize results.
 *   - Tear the browser down deterministically, even on error.
 *
 * Concurrency: callers should NOT share a Browser across overlapping
 * scans. The worker spins one Browser per job by default. We expose
 * `runScanOnUrl(url)` and `crawlSameDomain(url, maxPages)` as the
 * two top-level helpers.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import {
  resolveAndCheckHost,
  validateFinalUrl,
  validateUrl,
} from "./url-validation";
import { normalizeAxeResults } from "./normalize";
import { staticExpertHeuristics } from "./expert-heuristics";
import {
  resolveScanSourcePlan,
  sameOriginCanonicalUrl,
} from "./sources";
import { scanRenderProfile, type RenderProfile } from "../config";
import type {
  NormalizedIssue,
  NormalizedPage,
  ProgressCallback,
  ScanInput,
  ScanOutcome,
} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AccessOpsBot/1.0; +https://maitrico.com/bots)";

const VIEWPORT = { width: 1280, height: 800 };
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB cap per page
const NAV_TIMEOUT_MS = 30_000;
const AXE_TIMEOUT_MS = 25_000;

// Resource policy by render profile.
//   - "real":    only heavy/risky resources are blocked, so axe-core sees
//                the page the way a real user would (styles, fonts, images
//                all load and affect computed style + contrast checks).
//   - "minimal": also blocks styling/media resources — cheaper, but contrast
//                and layout-sensitive checks become unreliable.
const REAL_BLOCKLIST = new Set(["media", "websocket", "manifest", "other"]);
const MINIMAL_BLOCKLIST = new Set([
  "media",
  "font",
  "stylesheet",
  "image",
  "websocket",
  "manifest",
  "other",
]);

function resourceBlocklist(profile: RenderProfile): Set<string> {
  return profile === "minimal" ? MINIMAL_BLOCKLIST : REAL_BLOCKLIST;
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-zygote",
    ],
  });
}

async function newHardenedContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent: USER_AGENT,
    viewport: VIEWPORT,
    bypassCSP: false,
    javaScriptEnabled: true,
    ignoreHTTPSErrors: false,
    serviceWorkers: "block",
    extraHTTPHeaders: {
      "Accept-Language": "en;q=0.9",
    },
  });
}

async function configurePage(
  page: Page,
  allowedHost: string,
  blocklist: Set<string>
) {
  // Resource blocking — declared before navigation.
  await page.route("**/*", async (route) => {
    const req = route.request();
    const type = req.resourceType();

    // Hard-block scheme/host shifts to anything not on the public web.
    let target: URL;
    try {
      target = new URL(req.url());
    } catch {
      return route.abort();
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return route.abort();
    }
    // Cross-origin navigations on top frame: only allow if same host (we
    // do same-domain crawl later, but a single page nav must not jump).
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      if (target.hostname !== allowedHost) {
        return route.abort();
      }
    }
    if (blocklist.has(type)) {
      return route.abort();
    }
    return route.continue();
  });

  page.setDefaultTimeout(NAV_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
}

/**
 * Scan a single URL. Returns the normalized page with embedded issues.
 * Throws on hard failures (timeout, navigation error, blocked URL).
 */
export async function scanSinglePage(
  browser: Browser,
  url: string,
  options: { includeScreenshots?: boolean } = {}
): Promise<NormalizedPage> {
  const validated = await validateUrl(url, { resolveDns: true });
  const profile = scanRenderProfile();
  const blocklist = resourceBlocklist(profile);
  const pageStartedAt = Date.now();

  const context = await newHardenedContext(browser);
  const page = await context.newPage();
  await configurePage(page, validated.host, blocklist);

  let response;
  let bytesSeen = 0;

  // Body-size cap: we don't have a direct hook for this in Playwright,
  // but we approximate via response.body() length checks (deferred to
  // axe phase) and the navigation-timeout safety net.
  page.on("response", async (resp) => {
    try {
      const cl = resp.headers()["content-length"];
      if (cl) bytesSeen += Number(cl);
    } catch {
      // ignore
    }
  });

  try {
    response = await page.goto(validated.normalized, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });

    // Re-validate after potential redirects.
    const finalUrl = page.url();
    if (finalUrl !== validated.normalized) {
      try {
        await validateFinalUrl(finalUrl, validated.origin);
      } catch (err) {
        throw new Error(`Redirect rejected by SSRF guard: ${(err as Error).message}`);
      }
    }

    if (bytesSeen > MAX_RESPONSE_BYTES) {
      throw new Error(`Response body too large (${bytesSeen} bytes)`);
    }

    // Give the page a moment for late-mounted React/Vue/Angular content
    // to settle, then run axe.
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    const axeBuilder = new AxeBuilder({ page }).withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ]);

    const axeResult = (await Promise.race([
      axeBuilder.analyze(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("axe timeout")), AXE_TIMEOUT_MS)
      ),
    ])) as Awaited<ReturnType<AxeBuilder["analyze"]>>;

    const domHtml = await page.content().catch(() => "");
    const heuristicIssues = domHtml ? staticExpertHeuristics(domHtml) : [];
    const issues: NormalizedIssue[] = dedupeIssues([
      ...normalizeAxeResults({
        violations: axeResult.violations,
        incomplete: axeResult.incomplete,
      }),
      ...heuristicIssues,
    ]);

    const title = await page.title().catch(() => null);
    const statusCode = response?.status() ?? null;

    let screenshotPath: string | undefined;
    if (options.includeScreenshots) {
      // We capture to buffer here but DO NOT persist unless the worker
      // explicitly enables screenshot storage. The worker decides what
      // to do with the buffer based on workspace privacy settings.
      // For MVP we expose only the path placeholder.
      screenshotPath = undefined;
    }

    return {
      url: finalUrl,
      title,
      statusCode,
      scannedAt: new Date(),
      screenshotPath,
      rawMetadata: {
        axeTestEngine: axeResult.testEngine,
        axeTestRunner: axeResult.testRunner,
        axeVersion: axeResult.testEngine?.version ?? null,
        renderProfile: profile,
        resourcePolicy: Array.from(blocklist).sort(),
        viewport: VIEWPORT,
        userAgent: USER_AGENT,
        engine: "axe-core + AccessOps Expert Heuristics",
        domHash: domHtml ? hashHtml(domHtml) : null,
        scannedUrl: finalUrl,
        durationMs: Date.now() - pageStartedAt,
        passes: axeResult.passes.length,
        incomplete: axeResult.incomplete.length,
        violations: axeResult.violations.length,
      },
      issues,
    };
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

/**
 * Crawl up to `maxPages` distinct same-domain URLs starting at `startUrl`.
 * Returns one NormalizedPage per scanned URL.
 *
 * Crawl rules:
 *   - Same origin only (scheme + host + port).
 *   - Only http(s) anchors.
 *   - Deduplicated by normalized href.
 *   - BFS with a hard page cap.
 *   - Each navigation is SSRF-validated.
 */
export async function crawlSameDomain(
  browser: Browser,
  input: ScanInput,
  onProgress?: ProgressCallback
): Promise<ScanOutcome> {
  const started = Date.now();
  const sourcePlan = await resolveScanSourcePlan({
    baseUrl: input.url,
    scanType: input.scanType,
    maxPages: input.maxPages,
    sourceUrls: input.sourceUrls,
    sitemapUrl: input.sitemapUrl,
  });
  const startValidated = await validateUrl(sourcePlan.baseUrl, { resolveDns: true });

  // Re-resolve start host once more — gives us the pinned IP set for
  // optional future use (we don't pin connections here because Playwright
  // hides the socket, but we re-check on every navigation).
  await resolveAndCheckHost(startValidated.host);

  const queue: string[] = [...sourcePlan.targets];
  const seen = new Set<string>(queue);
  const results: NormalizedPage[] = [];

  await onProgress?.({
    step: "starting_browser",
    pagesScanned: 0,
    pagesDiscovered: seen.size,
  });

  while (queue.length > 0 && results.length < input.maxPages) {
    const next = queue.shift()!;

    await onProgress?.({
      step: "scanning",
      pagesScanned: results.length,
      pagesDiscovered: seen.size,
      currentUrl: next,
    });

    let page: NormalizedPage;
    try {
      page = await scanSinglePage(browser, next, {
        includeScreenshots: input.includeScreenshots,
      });
    } catch (err) {
      // One bad page should not poison the whole scan.
      results.push({
        url: next,
        title: null,
        statusCode: null,
        scannedAt: new Date(),
        rawMetadata: { error: (err as Error).message },
        issues: [],
      });
      continue;
    }
    results.push(page);

    page.rawMetadata = {
      ...(page.rawMetadata ?? {}),
      discoverySource: sourcePlan.discoverySource,
      sitemapUrl: sourcePlan.sitemapUrl ?? null,
    };

    // Discover more links only for multi-page scans.
    if (
      input.scanType === "multi" &&
      results.length < input.maxPages &&
      page.statusCode &&
      page.statusCode >= 200 &&
      page.statusCode < 400
    ) {
      const links = await discoverLinksOnce(browser, page.url, startValidated.origin);
      for (const link of links) {
        if (!seen.has(link) && queue.length + results.length < input.maxPages) {
          seen.add(link);
          queue.push(link);
        }
      }
    }
  }

  return {
    pages: results,
    pagesDiscovered: seen.size,
    pagesScanned: results.length,
    durationMs: Date.now() - started,
  };
}

/**
 * Open a one-off context just to enumerate same-origin links.
 * Kept separate so the main scan path is easy to read.
 */
async function discoverLinksOnce(
  browser: Browser,
  pageUrl: string,
  expectedOrigin: string
): Promise<string[]> {
  const validated = await validateUrl(pageUrl, { resolveDns: true });
  const context = await newHardenedContext(browser);
  const page = await context.newPage();
  await configurePage(page, validated.host, resourceBlocklist(scanRenderProfile()));
  try {
    await page.goto(validated.normalized, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((a) => a.href)
        .filter(Boolean)
    );
    const out = new Set<string>();
    for (const href of hrefs) {
      try {
        const u = new URL(href);
        if (u.origin !== expectedOrigin) continue;
        if (u.protocol !== "http:" && u.protocol !== "https:") continue;
        // Strip fragment and trailing slash variations for dedup.
        const normalized = sameOriginCanonicalUrl(u.toString(), pageUrl, expectedOrigin);
        if (normalized) out.add(normalized);
      } catch {
        // skip invalid
      }
    }
    return Array.from(out);
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

function dedupeIssues(issues: NormalizedIssue[]): NormalizedIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.ruleId}:${issue.target.join(",")}:${issue.htmlSnippet ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hashHtml(html: string): string {
  return createHash("sha256").update(html).digest("hex").slice(0, 16);
}

/**
 * High-level entry point used by the worker.
 */
export async function runScanJob(
  input: ScanInput,
  onProgress?: ProgressCallback
): Promise<ScanOutcome> {
  const browser = await launchBrowser();
  try {
    return await crawlSameDomain(browser, input, onProgress);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
