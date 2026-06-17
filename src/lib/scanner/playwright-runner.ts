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
 * Concurrency: a Browser CAN be shared across overlapping scans because each
 * page opens its own isolated `browser.newContext()`. In the worker the
 * BrowserManager owns one Chromium per process and passes it in via
 * `options.browser`; this module never launches per job on that path. Callers
 * without a shared browser (CLI / tests) get a throwaway launch+close.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import playwrightPackage from "playwright/package.json";
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
  ScannerErrorCode,
} from "./types";
import {
  SCAN_VIEWPORTS,
  SCAN_INTERACTIVE_STATES,
  SCAN_STATE_CANDIDATE_LIMIT,
} from "./types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PerceviaBot/1.0; +https://maitrico.com/bots)";

const VIEWPORTS: ScanViewport[] = [...SCAN_VIEWPORTS];
// Source of truth lives in ./types so the new-scan form's duration estimate is
// derived from the exact same plan this runner executes (no 18-vs-33 drift).
const INTERACTIVE_STATES: readonly Exclude<ScanState, "initial">[] =
  SCAN_INTERACTIVE_STATES;
const STATE_CANDIDATE_LIMIT = SCAN_STATE_CANDIDATE_LIMIT;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB cap per page
const NAV_TIMEOUT_MS = 30_000;
const AXE_TIMEOUT_MS = 25_000;
const MIN_SCAN_DEADLINE_MS = 500;
const PLAYWRIGHT_VERSION =
  typeof playwrightPackage.version === "string" ? playwrightPackage.version : null;

interface ScanDeadline {
  startedAt: number;
  deadlineAt: number;
  truncated: boolean;
}

interface PageVariantResult {
  finalUrl: string;
  title: string | null;
  statusCode: number | null;
  issues: NormalizedIssue[];
  metadata: Record<string, unknown>;
}

class ScannerRunnerError extends Error {
  constructor(
    public readonly code: ScannerErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ScannerRunnerError";
  }
}

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

export function createDeadline(timeoutMs: number): ScanDeadline {
  const startedAt = Date.now();
  return {
    startedAt,
    deadlineAt: startedAt + Math.max(MIN_SCAN_DEADLINE_MS, timeoutMs),
    truncated: false,
  };
}

/**
 * Remaining budget for a single Playwright call, capped at `capMs`.
 *
 * Floored at 1ms ON PURPOSE: Playwright treats a timeout of `0` as "disable the
 * timeout" — i.e. wait forever. Once the scan deadline is exhausted this would
 * otherwise return 0, which turns the very next `page.goto()` or
 * `waitForLoadState("networkidle")` into an UNBOUNDED hang (the page never
 * reaches network-idle on sites with polling/websockets/analytics beacons).
 * That is the root cause of scans that sit "in progress" forever and, once both
 * worker slots are stuck, of new scans staying "queued" forever. Returning >=1
 * makes an out-of-budget call time out immediately instead of hanging.
 */
function remainingMs(deadline: ScanDeadline, capMs: number): number {
  return Math.max(1, Math.min(capMs, deadline.deadlineAt - Date.now()));
}

function hasBudget(deadline: ScanDeadline, minMs = 250): boolean {
  return deadline.deadlineAt - Date.now() > minMs;
}

function assertBudget(deadline: ScanDeadline): void {
  if (!hasBudget(deadline)) {
    deadline.truncated = true;
    throw new ScannerRunnerError("deadline_exceeded", "Scan deadline exceeded.");
  }
}

function scannerError(err: unknown, fallback: ScannerErrorCode): {
  code: ScannerErrorCode;
  message: string;
} {
  if (err instanceof ScannerRunnerError) {
    return { code: err.code, message: err.message };
  }
  const message = err instanceof Error ? err.message : String(err || fallback);
  if (/deadline|timeout/i.test(message)) {
    return { code: "deadline_exceeded", message };
  }
  if (/axe/i.test(message)) {
    return { code: "axe_failed", message };
  }
  if (/state_not_available/i.test(message)) {
    return { code: "state_unavailable", message };
  }
  if (/navigation|goto|net::|redirect|ssrf|url validation/i.test(message)) {
    return { code: "navigation_failed", message };
  }
  return { code: fallback, message };
}

function pageErrorResult(
  url: string,
  err: unknown,
  fallback: ScannerErrorCode,
  extra: Record<string, unknown> = {}
): NormalizedPage {
  const normalized = scannerError(err, fallback);
  return {
    url,
    title: null,
    statusCode: null,
    scannedAt: new Date(),
    rawMetadata: {
      engine: "playwright-axe",
      scanner: "playwright-axe",
      fallbackMode: false,
      resultConfidence: "low",
      playwrightVersion: PLAYWRIGHT_VERSION,
      code: normalized.code,
      message: normalized.message,
      truncatedByDeadline: normalized.code === "deadline_exceeded",
      ...extra,
    },
    issues: [],
  };
}

function firstStringMetadata(
  metadata: Array<Record<string, unknown>>,
  key: string
): string | null {
  for (const item of metadata) {
    const value = item[key];
    if (typeof value === "string") return value;
  }
  return null;
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
    deadline?: ScanDeadline;
    signal?: AbortSignal;
    /** Fired as each viewport batch begins, for sub-page progress/heartbeat. */
    onViewport?: (viewportName: string) => void | Promise<void>;
  } = {}
): Promise<NormalizedPage> {
  const deadline = options.deadline ?? createDeadline(60_000);
  const validated = await validateUrl(url, { resolveDns: true });
  const profile = scanRenderProfile();
  const blocklist = resourceBlocklist(profile);
  const pageStartedAt = Date.now();
  const variants: PageVariantResult[] = [];

  for (const viewport of VIEWPORTS) {
    if (options.signal?.aborted) {
      throw new ScannerRunnerError(
        "deadline_exceeded",
        "Page scan deadline exceeded."
      );
    }
    if (!hasBudget(deadline)) {
      deadline.truncated = true;
      break;
    }
    await options.onViewport?.(viewport.name);
    const viewportResults = await scanViewportVariants({
      browser,
      url: validated.normalized,
      validated,
      profile,
      blocklist,
      viewport,
      visualEvidenceEnabled: !!options.visualEvidenceEnabled,
      evidenceBudget: options.evidenceBudget,
      deadline,
      signal: options.signal,
    });
    variants.push(...viewportResults);
  }

  if (!variants.length) {
    return pageErrorResult(url, new ScannerRunnerError("deadline_exceeded", "Scan deadline exceeded before any viewport completed."), "deadline_exceeded", {
      renderProfile: profile,
      resourcePolicy: Array.from(blocklist).sort(),
    });
  }

  const first = variants[0];
  const issues = dedupeIssues(variants.flatMap((variant) => variant.issues));
  const metadata = variants.map((variant) => variant.metadata);

  return {
    url: first.finalUrl,
    title: first.title,
    statusCode: first.statusCode,
    scannedAt: new Date(),
    rawMetadata: {
      axeVersion: firstStringMetadata(metadata, "axeVersion"),
      playwrightVersion: PLAYWRIGHT_VERSION,
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
      domHash: firstStringMetadata(metadata, "domHash"),
      scannedUrl: first.finalUrl,
      durationMs: Date.now() - pageStartedAt,
      truncatedByDeadline: deadline.truncated,
      variantCount: variants.length,
      variants: metadata,
    },
    issues,
  };
}

async function scanViewportVariants(args: {
  browser: Browser;
  url: string;
  validated: Awaited<ReturnType<typeof validateUrl>>;
  profile: RenderProfile;
  blocklist: Set<string>;
  viewport: ScanViewport;
  visualEvidenceEnabled: boolean;
  evidenceBudget?: EvidenceBudget;
  deadline: ScanDeadline;
  signal?: AbortSignal;
}): Promise<PageVariantResult[]> {
  const { browser, url, validated, profile, blocklist, viewport, deadline } = args;
  const context = await newHardenedContext(browser, viewport);
  const page = await context.newPage();
  await configurePage(page, validated.host, blocklist);
  let bytesSeen = 0;
  const results: PageVariantResult[] = [];

  page.on("response", async (resp) => {
    try {
      const cl = resp.headers()["content-length"];
      if (cl) bytesSeen += Number(cl);
    } catch {
      // ignore
    }
  });

  try {
    const initial = await scanPageVariant({
      page,
      url,
      validated,
      profile,
      viewport,
      state: "initial",
      bytesSeen: () => bytesSeen,
      visualEvidenceEnabled: args.visualEvidenceEnabled,
      evidenceBudget: args.evidenceBudget,
      deadline,
    });
    results.push(initial);

    for (const state of INTERACTIVE_STATES) {
      for (let candidateIndex = 0; candidateIndex < STATE_CANDIDATE_LIMIT; candidateIndex += 1) {
        if (args.signal?.aborted) {
          throw new ScannerRunnerError(
            "deadline_exceeded",
            "Page scan deadline exceeded."
          );
        }
        if (!hasBudget(deadline)) {
          deadline.truncated = true;
          return results;
        }
        const result = await scanPageVariant({
          page,
          url,
          validated,
          profile,
          viewport,
          state,
          candidateIndex,
          bytesSeen: () => bytesSeen,
          visualEvidenceEnabled: args.visualEvidenceEnabled,
          evidenceBudget: args.evidenceBudget,
          deadline,
        }).catch((err) => {
          const normalized = scannerError(err, "state_unavailable");
          if (normalized.code === "deadline_exceeded") deadline.truncated = true;
          return null;
        });
        if (!result) break;
        results.push(result);
      }
    }
    return results;
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

async function scanPageVariant(args: {
  page: Page;
  url: string;
  validated: Awaited<ReturnType<typeof validateUrl>>;
  profile: RenderProfile;
  viewport: ScanViewport;
  state: ScanState;
  candidateIndex?: number;
  bytesSeen: () => number;
  visualEvidenceEnabled: boolean;
  evidenceBudget?: EvidenceBudget;
  deadline: ScanDeadline;
}): Promise<PageVariantResult> {
  const { page, url, validated, profile, viewport, state, deadline } = args;
  assertBudget(deadline);

  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: remainingMs(deadline, NAV_TIMEOUT_MS),
  }).catch((err) => {
    const message = (err as Error).message;
    throw new ScannerRunnerError(
      /timeout/i.test(message) ? "deadline_exceeded" : "navigation_failed",
      message
    );
  });

  const finalUrl = page.url();
  if (finalUrl !== url) {
    try {
      await validateFinalUrl(finalUrl, validated.origin);
    } catch (err) {
      throw new ScannerRunnerError(
        "navigation_failed",
        `Redirect rejected by SSRF guard: ${(err as Error).message}`
      );
    }
  }

  if (args.bytesSeen() > MAX_RESPONSE_BYTES) {
    throw new ScannerRunnerError(
      "navigation_failed",
      `Response body too large (${args.bytesSeen()} bytes)`
    );
  }

  await page.waitForLoadState("networkidle", {
    timeout: remainingMs(deadline, 8_000),
  }).catch(() => undefined);

  if (state !== "initial") {
    const applied = await applyState(page, state, args.candidateIndex ?? 0);
    if (!applied) {
      throw new ScannerRunnerError("state_unavailable", "state_not_available");
    }
    await page.waitForTimeout(Math.min(350, remainingMs(deadline, 350))).catch(() => undefined);
    await page.waitForLoadState("networkidle", {
      timeout: remainingMs(deadline, 2_000),
    }).catch(() => undefined);
  }

  assertBudget(deadline);
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
      setTimeout(() => rej(new ScannerRunnerError("axe_failed", "axe timeout")), remainingMs(deadline, AXE_TIMEOUT_MS))
    ),
  ]).catch((err) => {
    const normalized = scannerError(err, "axe_failed");
    throw new ScannerRunnerError(normalized.code, normalized.message);
  })) as Awaited<ReturnType<AxeBuilder["analyze"]>>;

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
      playwrightVersion: PLAYWRIGHT_VERSION,
      viewport,
      state,
      candidateIndex: args.candidateIndex ?? null,
      domHash: domHtml ? hashHtml(domHtml) : null,
      passes: axeResult.passes.length,
      incomplete: axeResult.incomplete.length,
      violations: axeResult.violations.length,
      renderProfile: profile,
      deadlineRemainingMs: deadline.deadlineAt - Date.now(),
    },
  };
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
  const deadline = createDeadline(input.timeoutMs);
  let sourcePlanError: unknown = null;
  const sourcePlan = await resolveScanSourcePlan({
    baseUrl: input.url,
    scanType: input.scanType,
    maxPages: input.maxPages,
    sourceUrls: input.sourceUrls,
    sitemapUrl: input.sitemapUrl,
  }).catch((err) => {
    sourcePlanError = err;
    return null;
  });
  if (!sourcePlan) {
    return {
      pages: [pageErrorResult(input.url, sourcePlanError, "page_unavailable")],
      pagesDiscovered: 1,
      pagesScanned: 1,
      durationMs: Date.now() - started,
    };
  }
  const startValidated = await validateUrl(sourcePlan.baseUrl, { resolveDns: true }).catch((err) => err);
  if (startValidated instanceof Error) {
    return {
      pages: [pageErrorResult(sourcePlan.baseUrl, startValidated, "page_unavailable")],
      pagesDiscovered: 1,
      pagesScanned: 1,
      durationMs: Date.now() - started,
    };
  }

  // Re-resolve start host once more — gives us the pinned IP set for
  // optional future use (we don't pin connections here because Playwright
  // hides the socket, but we re-check on every navigation).
  const resolved = await resolveAndCheckHost(startValidated.host).catch((err) => err);
  if (resolved instanceof Error) {
    return {
      pages: [pageErrorResult(sourcePlan.baseUrl, resolved, "page_unavailable")],
      pagesDiscovered: 1,
      pagesScanned: 1,
      durationMs: Date.now() - started,
    };
  }

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
    if (!hasBudget(deadline)) {
      deadline.truncated = true;
      if (results.length > 0) {
        const last = results[results.length - 1];
        last.rawMetadata = {
          ...(last.rawMetadata ?? {}),
          truncatedByDeadline: true,
        };
      } else {
        results.push(
          pageErrorResult(
            queue[0] ?? input.url,
            new ScannerRunnerError("deadline_exceeded", "Scan deadline exceeded before the first page completed."),
            "deadline_exceeded"
          )
        );
      }
      break;
    }
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
        deadline,
        // Per-viewport ping: keeps the realtime UI moving and the worker
        // heartbeat fresh while a single page runs all of its analysis passes.
        onViewport: async (viewportName) => {
          await onProgress?.({
            step: "scanning",
            pagesScanned: results.length,
            pagesDiscovered: seen.size,
            currentUrl: next,
            currentState: viewportName,
          });
        },
      });
    } catch (err) {
      // One bad page should not poison the whole scan.
      results.push(pageErrorResult(next, err, "page_unavailable"));
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
      const links = await discoverLinksOnce(browser, page.url, startValidated.origin, deadline)
        .catch(() => []);
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
  expectedOrigin: string,
  deadline: ScanDeadline
): Promise<string[]> {
  if (!hasBudget(deadline)) {
    deadline.truncated = true;
    return [];
  }
  const validated = await validateUrl(pageUrl, { resolveDns: true });
  const context = await newHardenedContext(browser);
  const page = await context.newPage();
  await configurePage(page, validated.host, resourceBlocklist(scanRenderProfile()));
  try {
    await page.goto(validated.normalized, {
      waitUntil: "domcontentloaded",
      timeout: remainingMs(deadline, NAV_TIMEOUT_MS),
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
 *
 * In the worker, the caller passes the shared, process-wide Chromium via
 * `options.browser` (Phase 4): one browser per worker, a fresh context per page
 * inside `crawlSameDomain`. Without a browser (CLI / `scan:test` / unit tests)
 * it launches and tears down its own — never reused across calls.
 */
export async function runScanJob(
  input: ScanInput,
  onProgress?: ProgressCallback,
  options: { browser?: Browser } = {}
): Promise<ScanOutcome> {
  // A shared browser is owned by the BrowserManager; we only borrow it here and
  // must never close it — crawlSameDomain closes the per-page contexts it opens.
  if (options.browser) {
    return crawlSameDomain(options.browser, input, onProgress);
  }

  // Categorize the two distinct failure modes the UI/logs care about:
  // the browser never launched (env/image problem) vs. the scan itself
  // (navigation, axe) failed. Screenshot failures never reach here — they
  // are recorded per-issue and never abort the scan.
  let browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    throw new ScannerRunnerError(
      "browser_launch_failed",
      `Browser launch failed: ${(err as Error).message}`
    );
  }
  try {
    return await crawlSameDomain(browser, input, onProgress);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Resolve the list of URLs a scan should cover, WITHOUT scanning them — used by
 * the per-page job model (Phase 3) to enqueue one pageJob per URL.
 *
 *   - single/manual/sitemap: deterministic, no browser needed.
 *   - multi: BFS-discover same-origin links from the seed (bounded by maxPages
 *     and a wall-clock budget), launching a browser only for this step.
 *
 * Always returns at least the seed URL. Throws only on SSRF/validation failure
 * of the base URL (so the scan can fail cleanly before any pageJobs exist).
 */
export async function resolveScanTargets(
  input: ScanInput,
  budgetMs = 60_000,
  options: { browser?: Browser } = {}
): Promise<string[]> {
  const plan = await resolveScanSourcePlan({
    baseUrl: input.url,
    scanType: input.scanType,
    maxPages: input.maxPages,
    sourceUrls: input.sourceUrls,
    sitemapUrl: input.sitemapUrl,
  });
  if (input.scanType !== "multi") {
    return plan.targets.slice(0, Math.max(1, input.maxPages));
  }

  // Multi-page crawl: discover same-origin links up front, BFS, bounded.
  const startValidated = await validateUrl(plan.baseUrl, { resolveDns: true });
  const origin = startValidated.origin;
  const deadline = createDeadline(budgetMs);

  // In the worker, discovery reuses the shared browser (Phase 4); we only borrow
  // it (each discoverLinksOnce opens and closes its own context). Without one we
  // launch a throwaway browser just for discovery.
  const shared = options.browser ?? null;
  let browser: Browser;
  if (shared) {
    browser = shared;
  } else {
    try {
      browser = await launchBrowser();
    } catch {
      return plan.targets; // discovery needs Chromium; fall back to the seed
    }
  }
  try {
    const out: string[] = [...plan.targets];
    const seen = new Set<string>(out);
    const queue: string[] = [...plan.targets];
    while (queue.length > 0 && out.length < input.maxPages && hasBudget(deadline)) {
      const next = queue.shift()!;
      const links = await discoverLinksOnce(browser, next, origin, deadline).catch(() => []);
      for (const link of links) {
        if (out.length >= input.maxPages) break;
        if (seen.has(link)) continue;
        seen.add(link);
        out.push(link);
        queue.push(link);
      }
    }
    return out.slice(0, input.maxPages);
  } finally {
    if (!shared) await browser.close().catch(() => undefined);
  }
}
