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
  captureVisualEvidenceForIssues,
  createEvidenceBudget,
  type EvidenceBudget,
} from "./visual-evidence";
import {
  resolveScanSourcePlan,
  sameOriginCanonicalUrl,
} from "./sources";
import { scanRenderProfile, type RenderProfile } from "../config";
import type {
  IssueContext,
  NormalizedIssue,
  NormalizedPage,
  ProgressCallback,
  ScanInput,
  ScanOutcome,
  ScanState,
  ScanViewport,
} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AccessOpsBot/1.0; +https://maitrico.com/bots)";

const VIEWPORTS: ScanViewport[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const INTERACTIVE_STATES: Exclude<ScanState, "initial">[] = [
  "menu-open",
  "dialog-open",
  "accordion-open",
  "tab-open",
  "form-focus",
];
const STATE_CANDIDATE_LIMIT = 2;
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

async function newHardenedContext(
  browser: Browser,
  viewport: ScanViewport = VIEWPORTS[0]
): Promise<BrowserContext> {
  return browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: viewport.width, height: viewport.height },
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
  options: {
    includeScreenshots?: boolean;
    visualEvidenceEnabled?: boolean;
    evidenceBudget?: EvidenceBudget;
  } = {}
): Promise<NormalizedPage> {
  const validated = await validateUrl(url, { resolveDns: true });
  const profile = scanRenderProfile();
  const blocklist = resourceBlocklist(profile);
  const pageStartedAt = Date.now();
  const variants: Array<{
    finalUrl: string;
    title: string | null;
    statusCode: number | null;
    issues: NormalizedIssue[];
    metadata: Record<string, unknown>;
  }> = [];

  for (const viewport of VIEWPORTS) {
    const initial = await scanPageVariant({
      browser,
      url: validated.normalized,
      validated,
      profile,
      blocklist,
      viewport,
      state: "initial",
      visualEvidenceEnabled: !!options.visualEvidenceEnabled,
      evidenceBudget: options.evidenceBudget,
    });
    variants.push(initial);

    for (const state of INTERACTIVE_STATES) {
      for (let candidateIndex = 0; candidateIndex < STATE_CANDIDATE_LIMIT; candidateIndex += 1) {
        const result = await scanPageVariant({
          browser,
          url: validated.normalized,
          validated,
          profile,
          blocklist,
          viewport,
          state,
          candidateIndex,
          visualEvidenceEnabled: !!options.visualEvidenceEnabled,
          evidenceBudget: options.evidenceBudget,
        }).catch(() => null);
        if (!result) break;
        variants.push(result);
      }
    }
  }

  const first = variants[0];
  const issues = dedupeIssues(variants.flatMap((variant) => variant.issues));
  const metadata = variants.map((variant) => variant.metadata);

  let screenshotPath: string | undefined;
  if (options.includeScreenshots) {
    screenshotPath = undefined;
  }

  return {
    url: first.finalUrl,
    title: first.title,
    statusCode: first.statusCode,
    scannedAt: new Date(),
    screenshotPath,
    rawMetadata: {
      axeVersion: metadata.find((m) => typeof m.axeVersion === "string")?.axeVersion ?? null,
      renderProfile: profile,
      resourcePolicy: Array.from(blocklist).sort(),
      viewports: VIEWPORTS,
      viewport: VIEWPORTS[0],
      states: ["initial", ...INTERACTIVE_STATES],
      userAgent: USER_AGENT,
      engine: "playwright-axe",
      scanner: "playwright-axe",
      fallbackMode: false,
      resultConfidence: "high",
      domHash: metadata.find((m) => typeof m.domHash === "string")?.domHash ?? null,
      scannedUrl: first.finalUrl,
      durationMs: Date.now() - pageStartedAt,
      variants: metadata,
    },
    issues,
  };
}

async function scanPageVariant(args: {
  browser: Browser;
  url: string;
  validated: Awaited<ReturnType<typeof validateUrl>>;
  profile: RenderProfile;
  blocklist: Set<string>;
  viewport: ScanViewport;
  state: ScanState;
  candidateIndex?: number;
  visualEvidenceEnabled: boolean;
  evidenceBudget?: EvidenceBudget;
}): Promise<{
  finalUrl: string;
  title: string | null;
  statusCode: number | null;
  issues: NormalizedIssue[];
  metadata: Record<string, unknown>;
}> {
  const { browser, url, validated, profile, blocklist, viewport, state } = args;
  const context = await newHardenedContext(browser, viewport);
  const page = await context.newPage();
  await configurePage(page, validated.host, blocklist);
  let bytesSeen = 0;

  page.on("response", async (resp) => {
    try {
      const cl = resp.headers()["content-length"];
      if (cl) bytesSeen += Number(cl);
    } catch {
      // ignore
    }
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    });

    const finalUrl = page.url();
    if (finalUrl !== url) {
      try {
        await validateFinalUrl(finalUrl, validated.origin);
      } catch (err) {
        throw new Error(`Redirect rejected by SSRF guard: ${(err as Error).message}`);
      }
    }

    if (bytesSeen > MAX_RESPONSE_BYTES) {
      throw new Error(`Response body too large (${bytesSeen} bytes)`);
    }

    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    if (state !== "initial") {
      const applied = await applyState(page, state, args.candidateIndex ?? 0);
      if (!applied) {
        throw new Error("state_not_available");
      }
      await page.waitForTimeout(350).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => undefined);
    }

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
    const contextMeta: IssueContext = { viewport: viewport.name, state };
    let issues = withContext(
      [
        ...normalizeAxeResults({
          violations: axeResult.violations,
          incomplete: axeResult.incomplete,
        }),
        ...(domHtml ? staticExpertHeuristics(domHtml) : []),
      ],
      contextMeta
    );
    if (args.visualEvidenceEnabled && args.evidenceBudget) {
      issues = await captureVisualEvidenceForIssues({
        page,
        pageUrl: finalUrl,
        issues,
        viewport,
        state,
        budget: args.evidenceBudget,
        enabled: true,
      });
    }

    return {
      finalUrl,
      title: await page.title().catch(() => null),
      statusCode: response?.status() ?? null,
      issues,
      metadata: {
        axeVersion: axeResult.testEngine?.version ?? null,
        viewport,
        state,
        domHash: domHtml ? hashHtml(domHtml) : null,
        passes: axeResult.passes.length,
        incomplete: axeResult.incomplete.length,
        violations: axeResult.violations.length,
        renderProfile: profile,
      },
    };
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

async function applyState(
  page: Page,
  state: Exclude<ScanState, "initial">,
  candidateIndex: number
): Promise<boolean> {
  return page.evaluate(
    ({ state, candidateIndex }) => {
      const danger =
        /(checkout|payment|pay|purchase|buy|order|cart|delete|remove|destroy|submit|subscribe|sign\s?out|log\s?out)/i;
      const visible = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const name = (el: Element) =>
        [
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.getAttribute("data-testid"),
          el.getAttribute("id"),
          el.textContent,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
      const safe = (el: Element) => {
        const label = name(el);
        if (!visible(el) || danger.test(label)) return false;
        if (el instanceof HTMLButtonElement) {
          if (el.disabled || el.type === "submit" || el.closest("form")) return false;
        }
        if (el instanceof HTMLAnchorElement) {
          const href = el.getAttribute("href") ?? "";
          if (href && href !== "#" && !href.startsWith("#") && !href.startsWith("javascript:")) {
            return false;
          }
        }
        return true;
      };
      const click = (el: Element) => {
        (el as HTMLElement).scrollIntoView({ block: "center", inline: "center" });
        (el as HTMLElement).click();
        return true;
      };
      const buttonish = Array.from(
        document.querySelectorAll<HTMLElement>("button,[role='button'],summary")
      ).filter(safe);
      let candidates: HTMLElement[] = [];

      if (state === "menu-open") {
        candidates = buttonish.filter((el) => {
          const label = name(el);
          return (
            el.getAttribute("aria-expanded") === "false" &&
            (/menu|navigation|nav|hamburger/i.test(label) ||
              el.getAttribute("aria-haspopup") === "menu" ||
              /menu|nav/i.test(el.getAttribute("aria-controls") ?? ""))
          );
        });
      } else if (state === "dialog-open") {
        candidates = buttonish.filter((el) => {
          const label = name(el);
          return (
            el.getAttribute("aria-haspopup") === "dialog" ||
            /modal|dialog/i.test(label) ||
            /modal|dialog/i.test(el.getAttribute("aria-controls") ?? "")
          );
        });
      } else if (state === "accordion-open") {
        candidates = buttonish.filter((el) => {
          if (el.tagName.toLowerCase() === "summary") return true;
          const label = name(el);
          return (
            el.getAttribute("aria-expanded") === "false" &&
            !/menu|navigation|nav|modal|dialog/i.test(label) &&
            el.getAttribute("aria-haspopup") !== "menu" &&
            el.getAttribute("aria-haspopup") !== "dialog"
          );
        });
      } else if (state === "tab-open") {
        candidates = Array.from(
          document.querySelectorAll<HTMLElement>("[role='tab'][aria-selected='false']")
        ).filter(safe);
      } else if (state === "form-focus") {
        candidates = Array.from(
          document.querySelectorAll<HTMLElement>(
            "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']),textarea,select,[contenteditable='true']"
          )
        ).filter((el) => visible(el) && !(el as HTMLInputElement).disabled);
        const target = candidates[candidateIndex];
        if (!target) return false;
        target.scrollIntoView({ block: "center", inline: "center" });
        target.focus({ preventScroll: true });
        return document.activeElement === target;
      }

      const target = candidates[candidateIndex];
      return target ? click(target) : false;
    },
    { state, candidateIndex }
  );
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
  const evidenceBudget = createEvidenceBudget(
    input.visualEvidenceEnabled
      ? input.visualEvidenceMaxScreenshots ?? 0
      : 0
  );

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
        visualEvidenceEnabled: !!input.visualEvidenceEnabled,
        evidenceBudget,
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

function withContext(
  issues: NormalizedIssue[],
  context: IssueContext
): NormalizedIssue[] {
  return issues.map((issue) => ({
    ...issue,
    contexts: mergeContexts(issue.contexts ?? [], [context]),
  }));
}

function dedupeIssues(issues: NormalizedIssue[]): NormalizedIssue[] {
  const byKey = new Map<string, NormalizedIssue>();
  for (const issue of issues) {
    const key = issueKey(issue);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...issue,
        wcagTags: Array.from(new Set(issue.wcagTags)),
        contexts: mergeContexts(issue.contexts ?? [], []),
      });
      continue;
    }
    existing.wcagTags = Array.from(new Set([...existing.wcagTags, ...issue.wcagTags]));
    existing.contexts = mergeContexts(existing.contexts ?? [], issue.contexts ?? []);
    existing.humanReviewRequired =
      existing.humanReviewRequired || issue.humanReviewRequired;
    if (!existing.failureSummary && issue.failureSummary) {
      existing.failureSummary = issue.failureSummary;
    }
    if (shouldReplaceEvidence(existing, issue)) {
      existing.visualEvidence = issue.visualEvidence;
    }
  }
  return Array.from(byKey.values());
}

function shouldReplaceEvidence(existing: NormalizedIssue, incoming: NormalizedIssue): boolean {
  const current = existing.visualEvidence?.screenshotStatus;
  const next = incoming.visualEvidence?.screenshotStatus;
  if (!next) return false;
  if (!current) return true;
  const rank = { failed: 0, skipped: 1, pending: 2, captured: 3, redacted: 4 };
  return rank[next] > rank[current];
}

function mergeContexts(a: IssueContext[], b: IssueContext[]): IssueContext[] {
  const seen = new Set<string>();
  const out: IssueContext[] = [];
  for (const ctx of [...a, ...b]) {
    const key = `${ctx.viewport}:${ctx.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ctx);
  }
  return out;
}

function issueKey(issue: NormalizedIssue): string {
  const target = issue.target.map((part) => part.replace(/\s+/g, " ").trim()).join("|");
  const snippetHash = createHash("sha1")
    .update(issue.htmlSnippet ?? "")
    .digest("hex")
    .slice(0, 10);
  const reviewFlag =
    issue.severity === "review" || issue.humanReviewRequired ? "review" : "violation";
  return `${issue.ruleId}:${target}:${snippetHash}:${reviewFlag}`;
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
