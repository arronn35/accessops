/**
 * Privacy-safe visual evidence capture.
 *
 * Visual evidence is diagnostic only and may contain third-party copyrighted
 * or personal data. Do not redistribute publicly.
 */
import type { Locator, Page } from "playwright";
import { visualEvidenceRedactionEnabled } from "@/lib/config";
import type {
  BoundingBox,
  NormalizedIssue,
  ScanState,
  ScanViewport,
  VisualEvidenceMetadata,
} from "./types";
import { buildEvidenceClip } from "./evidence-crop";

const MIN_ELEMENT_SCREENSHOT_SIZE = 24;
const MAX_CLIP_WIDTH = 720;
const MAX_CLIP_HEIGHT = 520;
const MAX_SELECTOR_CANDIDATES = 4;
const TARGET_SETTLE_MS = 150;

const SENSITIVE_URL_PATTERN =
  /(?:^|[/?#&=-])(checkout|payment|billing|invoice|receipt|order-confirmation|confirmation|cart|account|settings|profile|dashboard|admin|private|portal|login|signin|sign-in|password|medical|health|bank|credit)(?:$|[/?#&=-])/i;

const TEXT_SENSITIVE_PATTERN =
  /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s().-]{7,}\d)|(?:\b\d[ -]*?){13,19}\b/gi;

export interface EvidenceBudget {
  remaining: number;
  seen: Set<string>;
}

export function createEvidenceBudget(maxScreenshots: number): EvidenceBudget {
  return { remaining: Math.max(0, maxScreenshots), seen: new Set<string>() };
}

export function prioritizeEvidenceIssues(issues: NormalizedIssue[]): NormalizedIssue[] {
  return [...issues].sort((a, b) => priorityScore(b) - priorityScore(a));
}

export function isSensitivePageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SENSITIVE_URL_PATTERN.test(`${parsed.pathname}${parsed.search}${parsed.hash}`);
  } catch {
    return true;
  }
}

export async function captureVisualEvidenceForIssues(args: {
  page: Page;
  pageUrl: string;
  issues: NormalizedIssue[];
  viewport: ScanViewport;
  state: ScanState;
  budget: EvidenceBudget;
  enabled: boolean;
}): Promise<NormalizedIssue[]> {
  const { page, pageUrl, viewport, state, budget, enabled } = args;
  if (!enabled) {
    return args.issues.map((issue) => withSkipped(issue, "screenshot_disabled"));
  }

  if (isSensitivePageUrl(pageUrl) || (await pageLooksSensitive(page))) {
    return args.issues.map((issue) => withSkipped(issue, "sensitive_page_skipped"));
  }

  const prioritized = new Set(
    prioritizeEvidenceIssues(args.issues)
      .slice(0, Math.max(0, budget.remaining))
      .map((issue) => issue)
  );
  const out: NormalizedIssue[] = [];
  for (const issue of args.issues) {
    if (!prioritized.has(issue)) {
      out.push(withSkipped(issue, "screenshot_limit_reached"));
      continue;
    }
    if (budget.remaining <= 0) {
      out.push(withSkipped(issue, "screenshot_limit_reached"));
      continue;
    }
    const selectors = usableSelectors(issue.target);
    if (selectors.length === 0) {
      out.push(withSkipped(issue, "selector_not_found"));
      continue;
    }
    const key = `${issue.ruleId}:${selectors.join("|")}:${pageUrl}`;
    if (budget.seen.has(key)) {
      out.push(withSkipped(issue, "duplicate_issue_skipped", selectors[0], viewport, state));
      continue;
    }

    const captured = await captureOne({ page, issue, selectors, viewport, state }).catch(
      (err): VisualEvidenceMetadata => ({
        visualEvidenceEnabled: true,
        screenshotStatus: "failed",
        screenshotFailureReason: (err as Error).message || "capture_failed",
        selector: selectors[0],
        viewport,
        state,
        redactionApplied: false,
      })
    );
    if (captured.screenshotStatus === "captured" || captured.screenshotStatus === "redacted") {
      budget.remaining -= 1;
      budget.seen.add(key);
    }
    out.push({ ...issue, visualEvidence: captured });
  }
  return out;
}

function usableSelectors(targets: string[] = []): string[] {
  const selectors: string[] = [];
  const seen = new Set<string>();
  for (const raw of targets) {
    const selector = raw.trim();
    if (!selector || selector.includes(" >> ")) continue;
    if (selector.length > 1000) continue;
    if (seen.has(selector)) continue;
    seen.add(selector);
    selectors.push(selector);
    if (selectors.length >= MAX_SELECTOR_CANDIDATES) break;
  }
  return selectors;
}

function withSkipped(
  issue: NormalizedIssue,
  reason: string,
  selector?: string,
  viewport?: ScanViewport,
  state?: ScanState
): NormalizedIssue {
  return {
    ...issue,
    visualEvidence: {
      visualEvidenceEnabled: false,
      screenshotStatus: "skipped",
      screenshotFailureReason: reason,
      selector,
      viewport,
      state,
      redactionApplied: false,
    },
  };
}

async function captureOne(args: {
  page: Page;
  issue: NormalizedIssue;
  selectors: string[];
  viewport: ScanViewport;
  state: ScanState;
}): Promise<VisualEvidenceMetadata> {
  const { page, selectors, viewport, state } = args;
  let lastSkipped: VisualEvidenceMetadata | null = null;

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    await locator.scrollIntoViewIfNeeded({ timeout: 4_000 }).catch(() => undefined);
    await page.waitForTimeout(TARGET_SETTLE_MS).catch(() => undefined);

    const visible = await locator.isVisible({ timeout: 750 }).catch(() => false);
    if (visible) {
      const captured = await captureVisibleLocator({ page, locator, selector, viewport, state });
      if (captured.screenshotStatus === "captured" || captured.screenshotStatus === "redacted") {
        return captured;
      }
      lastSkipped = captured;
    }

    const contextCapture = await captureDomTargetContext({ page, selector, viewport, state });
    if (
      contextCapture &&
      (contextCapture.screenshotStatus === "captured" || contextCapture.screenshotStatus === "redacted")
    ) {
      return contextCapture;
    }

    lastSkipped = contextCapture ?? skipped("element_not_visible", selector, viewport, state);
  }

  return (
    (await captureViewportContext({
      page,
      selector: selectors[0],
      viewport,
      state,
      reason: "element_not_visible_context_capture",
    })) ??
    lastSkipped ??
    skipped("element_not_visible", selectors[0], viewport, state)
  );
}

async function captureVisibleLocator(args: {
  page: Page;
  locator: Locator;
  selector: string;
  viewport: ScanViewport;
  state: ScanState;
}): Promise<VisualEvidenceMetadata> {
  const { page, locator, selector, viewport, state } = args;
  const box = await safeBoundingBox(locator);
  if (!box || box.width <= 0 || box.height <= 0) {
    return skipped("element_not_visible", selector, viewport, state);
  }

  const elementShotAllowed =
    box.width >= MIN_ELEMENT_SCREENSHOT_SIZE &&
    box.height >= MIN_ELEMENT_SCREENSHOT_SIZE &&
    box.width <= MAX_CLIP_WIDTH &&
    box.height <= MAX_CLIP_HEIGHT;

  let image: Buffer | null = null;
  let clip = box;
  const redactions = visualEvidenceRedactionEnabled()
    ? await collectSensitiveRects(page, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      })
    : [];

  if (elementShotAllowed && redactions.length === 0) {
    image = await screenshotOutlinedElement(locator).catch(() => null);
  }

  if (!image) {
    clip = buildEvidenceClip(box, viewport);
    image = await withPageOverlays(page, {
      highlight: box,
      redactions,
    }, () => {
      return page.screenshot({
        type: "png",
        fullPage: false,
        clip,
        timeout: 5_000,
      });
    });
  }

  const redacted = redactions.length > 0;

  return {
    visualEvidenceEnabled: true,
    screenshotStatus: redacted ? "redacted" : "captured",
    selector,
    viewport,
    state,
    boundingBox: box,
    redactionApplied: redacted,
    imageBuffer: image,
  };
}

async function captureDomTargetContext(args: {
  page: Page;
  selector: string;
  viewport: ScanViewport;
  state: ScanState;
}): Promise<VisualEvidenceMetadata | null> {
  const { page, selector, viewport, state } = args;
  const box = await resolveVisibleTargetRect(page, selector);
  if (!box) return null;

  const redactions = visualEvidenceRedactionEnabled()
    ? await collectSensitiveRects(page, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      })
    : [];
  const redacted = redactions.length > 0;
  const image = await withPageOverlays(
    page,
    {
      highlight: box,
      redactions,
    },
    () => page.screenshot({
      type: "png",
      fullPage: false,
      clip: buildEvidenceClip(box, viewport),
      timeout: 5_000,
    })
  ).catch(() => null);

  if (!image) return null;
  return {
    visualEvidenceEnabled: true,
    screenshotStatus: redacted ? "redacted" : "captured",
    screenshotFailureReason: "selector_context_capture",
    selector,
    viewport,
    state,
    boundingBox: box,
    redactionApplied: redacted,
    imageBuffer: image,
  };
}

async function captureViewportContext(args: {
  page: Page;
  selector: string;
  viewport: ScanViewport;
  state: ScanState;
  reason: string;
}): Promise<VisualEvidenceMetadata | null> {
  const { page, selector, viewport, state, reason } = args;
  const redactions = visualEvidenceRedactionEnabled()
    ? await collectSensitiveRects(page, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      })
    : [];
  const redacted = redactions.length > 0;
  const image = await withPageOverlays(
    page,
    { redactions },
    () => page.screenshot({ type: "png", fullPage: false, timeout: 5_000 })
  ).catch(() => null);

  if (!image) return null;
  return {
    visualEvidenceEnabled: true,
    screenshotStatus: redacted ? "redacted" : "captured",
    screenshotFailureReason: reason,
    selector,
    viewport,
    state,
    redactionApplied: redacted,
    imageBuffer: image,
  };
}

function skipped(
  reason: string,
  selector: string,
  viewport: ScanViewport,
  state: ScanState
): VisualEvidenceMetadata {
  return {
    visualEvidenceEnabled: true,
    screenshotStatus: "skipped",
    screenshotFailureReason: reason,
    selector,
    viewport,
    state,
    redactionApplied: false,
  };
}

async function safeBoundingBox(locator: Locator): Promise<BoundingBox | null> {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return null;
  return {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.max(0, Math.round(box.width)),
    height: Math.max(0, Math.round(box.height)),
  };
}

async function resolveVisibleTargetRect(page: Page, selector: string): Promise<BoundingBox | null> {
  await page
    .evaluate((selector) => {
      try {
        document.querySelector<HTMLElement>(selector)?.scrollIntoView({
          block: "center",
          inline: "center",
          behavior: "instant",
        });
      } catch {
        // Invalid selectors are handled by the follow-up resolver.
      }
    }, selector)
    .catch(() => undefined);
  await page.waitForTimeout(TARGET_SETTLE_MS).catch(() => undefined);

  return page
    .evaluate((selector) => {
      const rectFrom = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const left = Math.max(0, rect.left);
        const top = Math.max(0, rect.top);
        const right = Math.min(window.innerWidth, rect.right);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        if (right <= left || bottom <= top) return null;
        return {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        };
      };

      const isUsable = (el: Element) => {
        if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
          return false;
        }
        const rect = rectFrom(el);
        if (!rect || rect.width < 2 || rect.height < 2) return false;
        const area = rect.width * rect.height;
        const viewportArea = window.innerWidth * window.innerHeight;
        const tag = el.tagName.toLowerCase();
        if ((tag === "html" || tag === "body") && area > viewportArea * 0.85) return false;
        return true;
      };

      const add = (items: Element[], el: Element | null | undefined) => {
        if (el && !items.includes(el)) items.push(el);
      };

      let root: Element | null = null;
      try {
        root = document.querySelector(selector);
      } catch {
        return null;
      }
      if (!root) return null;

      const candidates: Element[] = [];
      add(candidates, root);
      add(candidates, root.closest("button,a,input,textarea,select,label,[role],[aria-label],[aria-labelledby]"));
      for (const child of Array.from(
        root.querySelectorAll("button,a,input,textarea,select,label,[role],[aria-label],[aria-labelledby]")
      ).slice(0, 20)) {
        add(candidates, child);
      }
      for (const child of Array.from(root.children).slice(0, 20)) add(candidates, child);
      let parent = root.parentElement;
      for (let depth = 0; parent && depth < 3; depth += 1) {
        add(candidates, parent);
        parent = parent.parentElement;
      }

      for (const candidate of candidates) {
        if (!isUsable(candidate)) continue;
        const rect = rectFrom(candidate);
        if (rect) return rect;
      }
      return null;
    }, selector)
    .then((box) =>
      box
        ? {
            x: Math.max(0, Math.round(box.x)),
            y: Math.max(0, Math.round(box.y)),
            width: Math.max(0, Math.round(box.width)),
            height: Math.max(0, Math.round(box.height)),
          }
        : null
    )
    .catch(() => null);
}

async function pageLooksSensitive(page: Page): Promise<boolean> {
  return page
    .evaluate(() => {
      const sensitive =
        /(password|passcode|checkout|payment|billing|card|cc-number|ssn|social security|medical|health|bank|account settings|private dashboard)/i;
      if (document.querySelector("input[type='password']")) return true;
      if (
        document.querySelector(
          "input[autocomplete*='cc-'],input[name*='card' i],input[id*='card' i],input[name*='billing' i],input[id*='billing' i]"
        )
      ) {
        return true;
      }
      const bodyText = document.body?.innerText?.slice(0, 8000) ?? "";
      return sensitive.test(bodyText);
    })
    .catch(() => true);
}

async function collectSensitiveRects(
  page: Page,
  reference: BoundingBox
): Promise<BoundingBox[]> {
  return page
    .evaluate(
      ({ reference, patternSource }) => {
        const pattern = new RegExp(patternSource, "gi");
        const sensitiveSelectors = [
          "input",
          "textarea",
          "select",
          "[contenteditable='true']",
          "[data-user-content]",
          "[data-personal]",
          "[class*='comment' i]",
          "[class*='review' i]",
          "[class*='message' i]",
          "[class*='address' i]",
          "[class*='profile' i]",
          "[class*='email' i]",
          "[class*='phone' i]",
        ].join(",");
        const refs: Array<{ x: number; y: number; width: number; height: number }> = [];
        const addRect = (rect: DOMRect | null) => {
          if (!rect || rect.width <= 0 || rect.height <= 0) return;
          const left = Math.max(rect.left, reference.x);
          const top = Math.max(rect.top, reference.y);
          const right = Math.min(rect.right, reference.x + reference.width);
          const bottom = Math.min(rect.bottom, reference.y + reference.height);
          if (right <= left || bottom <= top) return;
          refs.push({
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
          });
        };

        document.querySelectorAll<HTMLElement>(sensitiveSelectors).forEach((el) => {
          addRect(el.getBoundingClientRect());
        });

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent ?? "";
          if (!pattern.test(text)) {
            pattern.lastIndex = 0;
            continue;
          }
          pattern.lastIndex = 0;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of Array.from(range.getClientRects())) addRect(rect);
          range.detach();
        }
        return refs;
      },
      {
        reference,
        patternSource: TEXT_SENSITIVE_PATTERN.source,
      }
    )
    .catch(() => []);
}

function priorityScore(issue: NormalizedIssue): number {
  const impact = issue.impact === "critical" ? 100 : issue.impact === "serious" ? 80 : issue.impact === "moderate" ? 50 : 20;
  const review = issue.humanReviewRequired ? -5 : 0;
  const selector = issue.target.length > 0 ? 5 : 0;
  return impact + review + selector;
}

async function screenshotOutlinedElement(locator: Locator): Promise<Buffer> {
  return locator.evaluate(async (el) => {
    const target = el as HTMLElement;
    const previousOutline = target.style.outline;
    const previousOutlineOffset = target.style.outlineOffset;
    const previousBoxShadow = target.style.boxShadow;
    target.dataset.perceviaEvidenceOutline = "true";
    target.style.outline = "4px solid #2563eb";
    target.style.outlineOffset = "2px";
    target.style.boxShadow = "0 0 0 2px #ffffff inset";
    return { previousOutline, previousOutlineOffset, previousBoxShadow };
  }).then(async (previous) => {
    try {
      return await locator.screenshot({ type: "png", timeout: 5_000 });
    } finally {
      await locator.evaluate((el, previous) => {
        const target = el as HTMLElement;
        target.style.outline = previous.previousOutline;
        target.style.outlineOffset = previous.previousOutlineOffset;
        target.style.boxShadow = previous.previousBoxShadow;
        delete target.dataset.perceviaEvidenceOutline;
      }, previous).catch(() => undefined);
    }
  });
}

async function withPageOverlays<T>(
  page: Page,
  args: { highlight?: BoundingBox; redactions: BoundingBox[] },
  fn: () => Promise<T>
): Promise<T> {
  const overlayId = `percevia-visual-evidence-${Date.now()}`;
  await page.evaluate(({ overlayId, highlight, redactions }) => {
    const root = document.createElement("div");
    root.id = overlayId;
    root.setAttribute("aria-hidden", "true");
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    const addBox = (
      rect: { x: number; y: number; width: number; height: number },
      style: Partial<CSSStyleDeclaration>
    ) => {
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "fixed",
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: "4px",
        boxSizing: "border-box",
        ...style,
      });
      root.appendChild(box);
    };
    for (const rect of redactions) {
      addBox(rect, { background: "#111827", opacity: "0.92" });
    }
    if (highlight) {
      addBox(highlight, {
        border: "4px solid #2563eb",
        boxShadow: "0 0 0 2px #ffffff inset",
        background: "transparent",
      });
    }
    document.documentElement.appendChild(root);
  }, { overlayId, highlight: args.highlight ?? null, redactions: args.redactions });
  try {
    return await fn();
  } finally {
    await page.evaluate((overlayId) => {
      document.getElementById(overlayId)?.remove();
    }, overlayId).catch(() => undefined);
  }
}
