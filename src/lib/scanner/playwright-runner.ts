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
import {
  APPLY_STATE_SCRIPT,
  COLLECT_LINKS_SCRIPT,
  DOM_FINGERPRINT_SCRIPT,
  REVERT_STATE_SCRIPT,
  STATE_MARKER_ATTR,
  inlineScript,
} from "./browser-scripts";
import { scanContextPool, scanPageConcurrency } from "./context-pool";
import {
  isOpTimeout,
  safeDispose,
  waitForSettled,
  withOp,
  withOpOr,
  type SettleResult,
} from "./page-ops";
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

/** Rule tags requested from axe-core. See ../compliance/frameworks for what
 *  each WCAG success criterion maps to in law. */
const AXE_RULE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
] as const;

/** Readiness waits. `load` is the contract; network idle is a bonus (see
 *  waitForSettled) — most real pages never go idle at all. */
const LOAD_WAIT_MS = 5_000;
const IDLE_WAIT_MS = 2_000;
/** Settle time after driving a control before re-analysing. */
const STATE_SETTLE_MS = 350;
/** Bounds for renderer round-trips that Playwright itself never times out. */
const EVAL_TIMEOUT_MS = 8_000;
const CONTENT_TIMEOUT_MS = 8_000;
const TITLE_TIMEOUT_MS = 3_000;
/** Don't start a variant we cannot finish; don't reload without room to analyse. */
const MIN_VARIANT_BUDGET_MS = 3_000;
const MIN_RENAVIGATION_BUDGET_MS = 8_000;
/** A viewport reloads at most this many times to recover a dirty DOM. */
const MAX_RENAVIGATIONS_PER_VIEWPORT = 2;
const PLAYWRIGHT_VERSION =
  typeof playwrightPackage.version === "string" ? playwrightPackage.version : null;

interface ScanDeadline {
  startedAt: number;
  deadlineAt: number;
  truncated: boolean;
}

/** Outcome of analysing one viewport, including why it stopped early. */
interface ViewportRun {
  variants: PageVariantResult[];
  /** Page loads spent (1 in the healthy case). */
  navigations: number;
  /** Reloads forced by a state that could not be reverted in place. */
  renavigations: number;
  /** Axe passes skipped because the control changed nothing observable. */
  skippedUnchanged: number;
  /** Renderer round-trips that had to be abandoned. */
  opTimeouts: number;
  /** A page/context ignored close(); the browser should be recycled. */
  contextLeaked: boolean;
  /** Page-side throws, surfaced instead of being read as "no such control". */
  scriptErrors: string[];
  /** Same-origin hrefs seen on the loaded page (crawl input, first viewport). */
  links: string[];
  error: unknown;
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
    scanFailed: true,
    failureCode: normalized.code,
    rawMetadata: {
      engine: "playwright-axe",
      scanner: "playwright-axe",
      fallbackMode: false,
      resultConfidence: "low",
      scanFailed: true,
      failureCode: normalized.code,
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
    /**
     * Same-origin hrefs found on the loaded page. Supplied so a crawl does not
     * need a second navigation per page just to read its links.
     */
    onLinks?: (hrefs: string[]) => void;
  } = {}
): Promise<NormalizedPage> {
  const deadline = options.deadline ?? createDeadline(60_000);
  const validated = await validateUrl(url, { resolveDns: true });
  const profile = scanRenderProfile();
  const blocklist = resourceBlocklist(profile);
  const pageStartedAt = Date.now();
  const variants: PageVariantResult[] = [];
  const health = {
    navigations: 0,
    renavigations: 0,
    skippedUnchanged: 0,
    opTimeouts: 0,
    contextLeaked: false,
    viewportsCompleted: 0,
    viewportsFailed: 0,
    scriptErrors: [] as string[],
  };
  let firstError: unknown = null;
  let linksReported = false;

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
    // A viewport never throws: it reports what it managed to collect, so one
    // bad breakpoint cannot discard the analysis of the other two.
    //
    // The context slot is taken per viewport, not per page: a page holds
    // exactly one context at a time, and releasing between viewports lets a
    // parallel crawl interleave instead of reserving memory it is not using.
    const run = await scanContextPool().withSlot(() =>
      scanViewportVariants({
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
        collectLinks: Boolean(options.onLinks) && !linksReported,
      })
    );
    if (options.onLinks && !linksReported && run.links.length > 0) {
      linksReported = true;
      options.onLinks(run.links);
    }
    variants.push(...run.variants);
    health.navigations += run.navigations;
    health.renavigations += run.renavigations;
    health.skippedUnchanged += run.skippedUnchanged;
    health.opTimeouts += run.opTimeouts;
    health.contextLeaked = health.contextLeaked || run.contextLeaked;
    for (const scriptError of run.scriptErrors) {
      if (!health.scriptErrors.includes(scriptError)) health.scriptErrors.push(scriptError);
    }
    if (run.error) {
      health.viewportsFailed += 1;
      firstError ??= run.error;
    } else {
      health.viewportsCompleted += 1;
    }
  }

  if (!variants.length) {
    return pageErrorResult(
      url,
      firstError ??
        new ScannerRunnerError(
          "deadline_exceeded",
          "Scan deadline exceeded before any viewport completed."
        ),
      "deadline_exceeded",
      {
        renderProfile: profile,
        resourcePolicy: Array.from(blocklist).sort(),
        ...health,
      }
    );
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
      // Engine health for this page — how many loads it really cost, what was
      // skipped, and whether the renderer stopped answering.
      navigations: health.navigations,
      renavigations: health.renavigations,
      skippedUnchangedVariants: health.skippedUnchanged,
      opTimeouts: health.opTimeouts,
      contextLeaked: health.contextLeaked,
      viewportsCompleted: health.viewportsCompleted,
      viewportsFailed: health.viewportsFailed,
      scriptErrors: health.scriptErrors.slice(0, 5),
      degraded:
        health.viewportsFailed > 0 ||
        health.opTimeouts > 0 ||
        health.scriptErrors.length > 0,
      variants: metadata,
    },
    issues,
  };
}

/**
 * Everything one viewport needs, in a single browser context.
 *
 * The old shape re-navigated for *every* variant: 3 viewports × (1 initial +
 * 5 states × 2 candidates) = 33 full page loads per page, each followed by a
 * `networkidle` wait. Measured against real pages that wait was ~85% of the
 * total cost (0.5s–8s per pass) while the axe run itself was ~300ms — so a
 * single page routinely exceeded the whole job budget and came back
 * truncated, which is what "the scan hangs" looked like from the outside.
 *
 * Now: one navigation per viewport, states driven in-page, and a
 * re-navigation only when a state cannot be reverted cleanly.
 */
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
  /** Harvest crawl links from this viewport's already-loaded page. */
  collectLinks?: boolean;
}): Promise<ViewportRun> {
  const { browser, url, validated, profile, blocklist, viewport, deadline } = args;
  const run: ViewportRun = {
    variants: [],
    navigations: 0,
    renavigations: 0,
    skippedUnchanged: 0,
    opTimeouts: 0,
    contextLeaked: false,
    scriptErrors: [],
    links: [],
    error: null,
  };

  const context = await newHardenedContext(browser, viewport);
  const page = await context.newPage();
  await configurePage(page, validated.host, blocklist);

  let bytesSeen = 0;
  page.on("response", (resp) => {
    const cl = resp.headers()["content-length"];
    if (cl) bytesSeen += Number(cl) || 0;
  });

  try {
    const nav = await navigateForAnalysis({
      page,
      url,
      validated,
      deadline,
      bytesSeen: () => bytesSeen,
    });
    run.navigations += 1;

    const analyze = (state: ScanState, candidateIndex?: number) =>
      analyzeVariant({
        page,
        profile,
        viewport,
        state,
        candidateIndex,
        finalUrl: nav.finalUrl,
        statusCode: nav.statusCode,
        settle: nav.settle,
        deadline,
        visualEvidenceEnabled: args.visualEvidenceEnabled,
        evidenceBudget: args.evidenceBudget,
        run,
      });

    run.variants.push(await analyze("initial"));

    // The page is loaded and parsed right here, so crawl discovery is a DOM
    // read rather than a second navigation in its own context.
    if (args.collectLinks) {
      run.links = await withOpOr(
        "page.evaluate:links",
        Math.min(EVAL_TIMEOUT_MS, remainingMs(deadline, EVAL_TIMEOUT_MS)),
        () => page.evaluate<string[]>(inlineScript(COLLECT_LINKS_SCRIPT)),
        [] as string[]
      );
    }

    const baseline = await domFingerprint(page, run);

    states: for (const state of INTERACTIVE_STATES) {
      for (let candidateIndex = 0; candidateIndex < STATE_CANDIDATE_LIMIT; candidateIndex += 1) {
        if (args.signal?.aborted) {
          throw new ScannerRunnerError("deadline_exceeded", "Page scan deadline exceeded.");
        }
        // A variant needs an axe pass plus teardown; starting one with less
        // than that left only produces a truncated result.
        if (!hasBudget(deadline, MIN_VARIANT_BUDGET_MS)) {
          deadline.truncated = true;
          break states;
        }

        const before = await domFingerprint(page, run);
        const applied = await applyState(page, state, candidateIndex, run);
        if (applied === "unavailable") break; // no further candidates for this state
        if (applied === "blocked") break states; // renderer is not answering

        await page
          .waitForTimeout(Math.min(STATE_SETTLE_MS, remainingMs(deadline, STATE_SETTLE_MS)))
          .catch(() => undefined);

        const after = await domFingerprint(page, run);
        if (before && after && before === after) {
          // The control did nothing observable; axe would return a
          // byte-identical result, so the pass is pure cost.
          run.skippedUnchanged += 1;
        } else {
          run.variants.push(await analyze(state, candidateIndex));
        }

        const reverted = await revertState(page, state, run);
        const clean =
          reverted === "reverted" && (await domFingerprint(page, run)) === baseline;
        if (clean) continue;
        if (reverted === "blocked") break states;

        // Could not put the DOM back: reload so the next candidate is probed
        // from the same starting point the first one saw.
        if (
          run.renavigations >= MAX_RENAVIGATIONS_PER_VIEWPORT ||
          !hasBudget(deadline, MIN_RENAVIGATION_BUDGET_MS)
        ) {
          break states;
        }
        try {
          await navigateForAnalysis({
            page,
            url,
            validated,
            deadline,
            bytesSeen: () => bytesSeen,
          });
          run.navigations += 1;
          run.renavigations += 1;
        } catch {
          break states;
        }
      }
    }
  } catch (err) {
    run.error = err;
    if (isOpTimeout(err)) run.opTimeouts += 1;
  } finally {
    const disposed = await safeDispose({ page, context });
    run.contextLeaked = disposed.leaked;
  }

  return run;
}

/** Navigate, re-validate the post-redirect URL, and wait until analysable. */
async function navigateForAnalysis(args: {
  page: Page;
  url: string;
  validated: Awaited<ReturnType<typeof validateUrl>>;
  deadline: ScanDeadline;
  bytesSeen: () => number;
}): Promise<{ finalUrl: string; statusCode: number | null; settle: SettleResult }> {
  const { page, url, validated, deadline } = args;
  assertBudget(deadline);

  const response = await page
    .goto(url, {
      waitUntil: "domcontentloaded",
      timeout: remainingMs(deadline, NAV_TIMEOUT_MS),
    })
    .catch((err) => {
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

  const settle = await waitForSettled(page, {
    loadMs: remainingMs(deadline, LOAD_WAIT_MS),
    idleMs: remainingMs(deadline, IDLE_WAIT_MS),
  });

  return { finalUrl, statusCode: response?.status() ?? null, settle };
}

/** Run axe + heuristics + optional evidence on whatever is on screen now. */
async function analyzeVariant(args: {
  page: Page;
  profile: RenderProfile;
  viewport: ScanViewport;
  state: ScanState;
  candidateIndex?: number;
  finalUrl: string;
  statusCode: number | null;
  settle: SettleResult;
  deadline: ScanDeadline;
  visualEvidenceEnabled: boolean;
  evidenceBudget?: EvidenceBudget;
  run: ViewportRun;
}): Promise<PageVariantResult> {
  const { page, profile, viewport, state, deadline, run } = args;
  assertBudget(deadline);

  const axeBuilder = new AxeBuilder({ page }).withTags([...AXE_RULE_TAGS]);
  const axeResult = (await withOp("axe.analyze", remainingMs(deadline, AXE_TIMEOUT_MS), () =>
    axeBuilder.analyze()
  ).catch((err) => {
    if (isOpTimeout(err)) {
      run.opTimeouts += 1;
      throw new ScannerRunnerError("axe_failed", "axe timeout");
    }
    const normalized = scannerError(err, "axe_failed");
    throw new ScannerRunnerError(normalized.code, normalized.message);
  })) as Awaited<ReturnType<AxeBuilder["analyze"]>>;

  const domHtml = await withOpOr(
    "page.content",
    remainingMs(deadline, CONTENT_TIMEOUT_MS),
    () => page.content(),
    ""
  );
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
      pageUrl: args.finalUrl,
      issues,
      viewport,
      state,
      budget: args.evidenceBudget,
      enabled: true,
    });
  }

  return {
    finalUrl: args.finalUrl,
    title: await withOpOr("page.title", remainingMs(deadline, TITLE_TIMEOUT_MS), () => page.title(), null),
    statusCode: args.statusCode,
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
      settleLevel: args.settle.level,
      settleWaitedMs: args.settle.waitedMs,
      deadlineRemainingMs: deadline.deadlineAt - Date.now(),
    },
  };
}

/**
 * Cheap signature of the parts of the DOM an interactive state changes.
 *
 * Used for two things: skipping an axe pass when a control did nothing, and
 * proving a state was fully reverted before probing the next candidate.
 */
async function domFingerprint(page: Page, run: ViewportRun): Promise<string | null> {
  const value = await withOpOr(
    "page.evaluate:fingerprint",
    EVAL_TIMEOUT_MS,
    () => page.evaluate<string>(inlineScript(DOM_FINGERPRINT_SCRIPT)),
    null as string | null
  );
  if (value === null) run.opTimeouts += 1;
  return value;
}

type StateApplication = "applied" | "unavailable" | "blocked";
type StateReversion = "reverted" | "dirty" | "blocked";

/**
 * Drive the page into an interactive state, tagging the element we touched so
 * `revertState` can undo exactly that action.
 */
async function applyState(
  page: Page,
  state: Exclude<ScanState, "initial">,
  candidateIndex: number,
  run: ViewportRun
): Promise<StateApplication> {
  try {
    const applied = await withOp("page.evaluate:applyState", EVAL_TIMEOUT_MS, () =>
      page.evaluate<boolean>(
        inlineScript(APPLY_STATE_SCRIPT, {
          state,
          candidateIndex,
          marker: STATE_MARKER_ATTR,
        })
      )
    );
    return applied ? "applied" : "unavailable";
  } catch (err) {
    if (isOpTimeout(err)) {
      run.opTimeouts += 1;
      return "blocked";
    }
    // A page-side throw means the state could not be driven here; it must not
    // be mistaken for "this page has no menu".
    run.scriptErrors.push(`applyState:${state}:${(err as Error).message}`.slice(0, 200));
    return "unavailable";
  }
}

/** Undo the exact element `applyState` touched, so no reload is needed. */
async function revertState(
  page: Page,
  state: Exclude<ScanState, "initial">,
  run: ViewportRun
): Promise<StateReversion> {
  try {
    const reverted = await withOp("page.evaluate:revertState", EVAL_TIMEOUT_MS, () =>
      page.evaluate<boolean>(inlineScript(REVERT_STATE_SCRIPT, { state, marker: STATE_MARKER_ATTR }))
    );
    return reverted ? "reverted" : "dirty";
  } catch (err) {
    if (isOpTimeout(err)) {
      run.opTimeouts += 1;
      return "blocked";
    }
    run.scriptErrors.push(`revertState:${state}:${(err as Error).message}`.slice(0, 200));
    return "dirty";
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

  // ---- Shared crawl frontier -------------------------------------------
  //
  // Pages are scanned by a small pool of workers rather than one at a time.
  // Everything below is deliberately synchronous: claiming a URL, counting
  // against `maxPages` and pushing discovered links all happen in one tick,
  // so two workers can never claim the same page or overshoot the cap.
  const queue: string[] = [...sourcePlan.targets];
  const seen = new Set<string>(queue);
  const completed = new Map<number, NormalizedPage>();
  const evidenceBudget = createEvidenceBudget(
    input.visualEvidenceEnabled
      ? input.visualEvidenceMaxScreenshots ?? 0
      : 0
  );
  let claimed = 0;
  let lastStartedUrl: string | null = null;

  /** Claim the next URL, or null when the crawl is finished/full. */
  const claimNext = (): { url: string; index: number } | null => {
    if (claimed >= input.maxPages) return null;
    const url = queue.shift();
    if (!url) return null;
    const index = claimed;
    claimed += 1;
    return { url, index };
  };

  /** Room left for newly discovered URLs: in-flight + done + already queued. */
  const enqueueDiscovered = (links: string[]): void => {
    for (const link of links) {
      if (claimed + queue.length >= input.maxPages) return;
      if (seen.has(link)) continue;
      seen.add(link);
      queue.push(link);
    }
  };

  const reportProgress = async (currentUrl?: string | null, currentState?: string) => {
    await onProgress?.({
      step: "scanning",
      pagesScanned: completed.size,
      pagesDiscovered: seen.size,
      currentUrl: currentUrl ?? lastStartedUrl ?? undefined,
      ...(currentState ? { currentState } : {}),
    });
  };

  await onProgress?.({
    step: "starting_browser",
    pagesScanned: 0,
    pagesDiscovered: seen.size,
  });

  const collectLinks = input.scanType === "multi";

  let inFlight = 0;

  const scanWorker = async (): Promise<void> => {
    for (;;) {
      if (!hasBudget(deadline)) {
        deadline.truncated = true;
        return;
      }
      if (claimed >= input.maxPages) return;

      const claim = claimNext();
      if (!claim) {
        // Empty frontier: a peer that is still scanning may yet discover more
        // links. Only stop once nothing is in flight to grow it.
        if (inFlight === 0) return;
        await idle(FRONTIER_POLL_MS);
        continue;
      }

      inFlight += 1;
      lastStartedUrl = claim.url;
      await reportProgress(claim.url);

      let page: NormalizedPage;
      try {
        page = await scanSinglePage(browser, claim.url, {
          includeScreenshots: input.includeScreenshots,
          visualEvidenceEnabled: !!input.visualEvidenceEnabled,
          evidenceBudget,
          deadline,
          // Links come from the page this scan already loaded, so a crawl
          // costs one navigation per page instead of two.
          onLinks: collectLinks
            ? (hrefs) =>
                enqueueDiscovered(
                  normalizeDiscoveredLinks(hrefs, claim.url, startValidated.origin)
                )
            : undefined,
          // Per-viewport ping: keeps the realtime UI moving and the worker
          // heartbeat fresh while a single page runs all of its analysis passes.
          onViewport: async (viewportName) => {
            await reportProgress(claim.url, viewportName);
          },
        });
      } catch (err) {
        // One bad page should not poison the whole scan.
        completed.set(claim.index, pageErrorResult(claim.url, err, "page_unavailable"));
        continue;
      } finally {
        inFlight -= 1;
      }

      page.rawMetadata = {
        ...(page.rawMetadata ?? {}),
        discoverySource: sourcePlan.discoverySource,
        sitemapUrl: sourcePlan.sitemapUrl ?? null,
      };
      completed.set(claim.index, page);
      await reportProgress();
    }
  };

  // Sized against the page cap, never the seed count: a crawl starts with one
  // URL and discovers the rest as it goes. Every worker still queues on the
  // process-wide context pool, so the memory ceiling holds no matter how many
  // scans are running at once.
  const workerCount = Math.max(1, Math.min(scanPageConcurrency(), input.maxPages));
  await Promise.all(Array.from({ length: workerCount }, () => scanWorker()));

  // Restore claim order: results must not depend on which page finished first.
  const results = Array.from(completed.keys())
    .sort((a, b) => a - b)
    .map((index) => completed.get(index)!);

  if (results.length === 0) {
    results.push(
      pageErrorResult(
        sourcePlan.targets[0] ?? input.url,
        new ScannerRunnerError(
          "deadline_exceeded",
          "Scan deadline exceeded before the first page completed."
        ),
        "deadline_exceeded"
      )
    );
  } else if (deadline.truncated) {
    const last = results[results.length - 1];
    last.rawMetadata = {
      ...(last.rawMetadata ?? {}),
      truncatedByDeadline: true,
    };
  }

  return {
    pages: results,
    pagesDiscovered: seen.size,
    pagesScanned: results.length,
    durationMs: Date.now() - started,
    concurrency: workerCount,
  };
}


/**
 * How long a worker waits before re-checking an empty frontier.
 *
 * A crawl starts from a single seed and only grows once that page has been
 * read, so workers must idle rather than exit the moment the queue is empty —
 * otherwise the whole crawl collapses back to one worker.
 */
const FRONTIER_POLL_MS = 25;

const idle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Filter raw hrefs down to crawlable, same-origin, canonical URLs.
 *
 * Shared by both discovery paths: the links a page hands back while it is
 * being scanned, and the standalone discovery pass used to plan page jobs.
 */
export function normalizeDiscoveredLinks(
  hrefs: readonly string[],
  pageUrl: string,
  expectedOrigin: string
): string[] {
  const out = new Set<string>();
  for (const href of hrefs) {
    try {
      const parsed = new URL(href);
      if (parsed.origin !== expectedOrigin) continue;
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      // Strip fragment and trailing-slash variations for dedup.
      const normalized = sameOriginCanonicalUrl(parsed.toString(), pageUrl, expectedOrigin);
      if (normalized) out.add(normalized);
    } catch {
      // Skip anything that is not a usable absolute URL.
    }
  }
  return Array.from(out);
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
    // Bounded: link extraction runs on the renderer's main thread, which a
    // busy page can hold indefinitely.
    const hrefs = await withOpOr(
      "page.evaluate:links",
      Math.min(EVAL_TIMEOUT_MS, remainingMs(deadline, EVAL_TIMEOUT_MS)),
      () => page.evaluate<string[]>(inlineScript(COLLECT_LINKS_SCRIPT)),
      [] as string[]
    );
    return normalizeDiscoveredLinks(hrefs, pageUrl, expectedOrigin);
  } finally {
    await safeDispose({ page, context });
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
    // Breadth-first, but several pages are fetched at once. Like the scan
    // crawl, all bookkeeping is synchronous so the page cap is exact and no
    // URL is visited twice; each fetch still takes a slot from the global
    // context pool, so discovery cannot exceed the memory ceiling either.
    const out: string[] = [...plan.targets];
    const seen = new Set<string>(out);
    const queue: string[] = [...plan.targets];
    let inFlight = 0;

    const record = (links: string[]): void => {
      for (const link of links) {
        if (out.length >= input.maxPages) return;
        if (seen.has(link)) continue;
        seen.add(link);
        out.push(link);
        queue.push(link);
      }
    };

    const discoverWorker = async (): Promise<void> => {
      for (;;) {
        if (out.length >= input.maxPages || !hasBudget(deadline)) return;
        const next = queue.shift();
        if (next === undefined) {
          // Nothing queued right now, but a peer may still be about to push
          // more. Give it a turn before deciding the frontier is exhausted.
          if (inFlight === 0) return;
          await idle(FRONTIER_POLL_MS);
          continue;
        }
        inFlight += 1;
        try {
          const links = await scanContextPool()
            .withSlot(() => discoverLinksOnce(browser, next, origin, deadline))
            .catch(() => [] as string[]);
          record(links);
        } finally {
          inFlight -= 1;
        }
      }
    };

    const workerCount = Math.max(1, Math.min(scanPageConcurrency(), input.maxPages));
    await Promise.all(Array.from({ length: workerCount }, () => discoverWorker()));
    return out.slice(0, input.maxPages);
  } finally {
    if (!shared) await browser.close().catch(() => undefined);
  }
}
