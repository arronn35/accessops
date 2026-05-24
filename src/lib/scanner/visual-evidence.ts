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

const MIN_ELEMENT_SCREENSHOT_SIZE = 24;
const CLIP_PADDING = 32;
const MAX_CLIP_WIDTH = 720;
const MAX_CLIP_HEIGHT = 520;

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
    const selector = firstUsableSelector(issue.target);
    if (!selector) {
      out.push(withSkipped(issue, "selector_not_found"));
      continue;
    }
    const key = `${issue.ruleId}:${selector}:${pageUrl}`;
    if (budget.seen.has(key)) {
      out.push(withSkipped(issue, "duplicate_issue_skipped", selector, viewport, state));
      continue;
    }

    const captured = await captureOne({ page, issue, selector, viewport, state }).catch(
      (err): VisualEvidenceMetadata => ({
        visualEvidenceEnabled: true,
        screenshotStatus: "failed",
        screenshotFailureReason: (err as Error).message || "capture_failed",
        selector,
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

function firstUsableSelector(targets: string[] = []): string | null {
  for (const raw of targets) {
    const selector = raw.trim();
    if (!selector || selector.includes(" >> ")) continue;
    if (selector.length > 1000) continue;
    return selector;
  }
  return null;
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
  selector: string;
  viewport: ScanViewport;
  state: ScanState;
}): Promise<VisualEvidenceMetadata> {
  const { page, selector, viewport, state } = args;
  const locator = page.locator(selector).first();
  const visible = await locator.isVisible().catch(() => false);
  if (!visible) {
    return skipped("element_not_visible", selector, viewport, state);
  }
  await locator.scrollIntoViewIfNeeded({ timeout: 4_000 }).catch(() => undefined);
  await page.waitForTimeout(100).catch(() => undefined);

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
  let redactions = visualEvidenceRedactionEnabled()
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
    clip = buildClip(box, viewport);
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

function buildClip(box: BoundingBox, viewport: ScanViewport): BoundingBox {
  const x = Math.max(0, Math.floor(box.x - CLIP_PADDING));
  const y = Math.max(0, Math.floor(box.y - CLIP_PADDING));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + CLIP_PADDING));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + CLIP_PADDING));
  return {
    x,
    y,
    width: Math.max(1, Math.min(MAX_CLIP_WIDTH, right - x)),
    height: Math.max(1, Math.min(MAX_CLIP_HEIGHT, bottom - y)),
  };
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
    target.dataset.accessopsEvidenceOutline = "true";
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
        delete target.dataset.accessopsEvidenceOutline;
      }, previous).catch(() => undefined);
    }
  });
}

async function withPageOverlays<T>(
  page: Page,
  args: { highlight: BoundingBox; redactions: BoundingBox[] },
  fn: () => Promise<T>
): Promise<T> {
  const overlayId = `accessops-visual-evidence-${Date.now()}`;
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
    addBox(highlight, {
      border: "4px solid #2563eb",
      boxShadow: "0 0 0 2px #ffffff inset",
      background: "transparent",
    });
    document.documentElement.appendChild(root);
  }, { overlayId, highlight: args.highlight, redactions: args.redactions });
  try {
    return await fn();
  } finally {
    await page.evaluate((overlayId) => {
      document.getElementById(overlayId)?.remove();
    }, overlayId).catch(() => undefined);
  }
}
