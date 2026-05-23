import {
  validateFinalUrl,
  validateUrl,
  type ValidatedUrl,
} from "./url-validation";
import type {
  NormalizedIssue,
  NormalizedPage,
  ProgressCallback,
  ScanInput,
  ScanOutcome,
  Severity,
  Impact,
  IssueContext,
} from "./types";
import { staticExpertHeuristics } from "./expert-heuristics";
import { resolveScanSourcePlan, sameOriginCanonicalUrl } from "./sources";

const DEFAULT_FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
const MAX_INLINE_PAGES = Math.max(1, Number(process.env.INLINE_SCAN_MAX_PAGES ?? 25));

interface HtmlAnalysis {
  title: string | null;
  issues: NormalizedIssue[];
  links: string[];
}

interface FetchResult {
  url: string;
  statusCode: number | null;
  contentType: string | null;
  html: string;
}

export async function runStaticScanJob(
  input: ScanInput,
  onProgress?: ProgressCallback
): Promise<ScanOutcome> {
  const started = Date.now();
  const plan = await resolveScanSourcePlan({
    baseUrl: input.url,
    scanType: input.scanType,
    maxPages: input.maxPages,
    sourceUrls: input.sourceUrls,
    sitemapUrl: input.sitemapUrl,
  });
  const startUrl = await validateUrl(plan.baseUrl, { resolveDns: true });
  const maxPages = Math.max(1, Math.min(input.maxPages, MAX_INLINE_PAGES));
  const shouldCrawl = input.scanType === "multi";
  const queue = [...plan.targets].slice(0, maxPages);
  const discovered = new Set(queue);
  const scanned = new Set<string>();
  const pages: NormalizedPage[] = [];

  await onProgress?.({
    step: "crawling",
    pagesScanned: 0,
    pagesDiscovered: discovered.size,
    currentUrl: startUrl.normalized,
  });

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;
    if (scanned.has(current)) continue;
    scanned.add(current);

    await onProgress?.({
      step: "scanning",
      pagesScanned: pages.length,
      pagesDiscovered: discovered.size,
      currentUrl: current,
    });

    const fetched = await fetchHtmlSafely(current, startUrl);
    const analysis = fetched.html
      ? analyzeHtml(fetched.html, fetched.url)
      : { title: null, issues: [], links: [] };

    pages.push({
      url: fetched.url,
      title: analysis.title,
      statusCode: fetched.statusCode,
      scannedAt: new Date(),
      rawMetadata: {
        engine: "static-html-fallback",
        scanner: "static-html",
        renderProfile: "static-fetch",
        fallbackMode: true,
        resultConfidence: "low",
        viewports: [],
        states: ["initial"],
        contentType: fetched.contentType,
        pageCap: maxPages,
        discoverySource: plan.discoverySource,
        sitemapUrl: plan.sitemapUrl ?? null,
      },
      issues: analysis.issues,
    });

    if (shouldCrawl) {
      for (const link of analysis.links) {
        if (discovered.size >= maxPages) break;
        const normalized = sameOriginCanonicalUrl(link, fetched.url, startUrl.origin);
        if (!normalized || discovered.has(normalized)) continue;
        discovered.add(normalized);
        queue.push(normalized);
      }
    }
  }

  await onProgress?.({
    step: "processing",
    pagesScanned: pages.length,
    pagesDiscovered: Math.max(discovered.size, pages.length),
  });

  return {
    pages,
    pagesDiscovered: Math.max(discovered.size, pages.length),
    pagesScanned: pages.length,
    durationMs: Date.now() - started,
  };
}

export function analyzeHtml(html: string, pageUrl = "https://example.com/"): HtmlAnalysis {
  const clipped = html.slice(0, MAX_HTML_BYTES);
  const title = textContent(firstMatch(clipped, /<title\b[^>]*>([\s\S]*?)<\/title>/i));
  const issues: NormalizedIssue[] = [];

  if (!title) {
    issues.push(issue({
      ruleId: "document-title",
      impact: "serious",
      severity: "critical",
      wcagTags: ["wcag2a", "wcag242"],
      description: "Pages need a descriptive title so people can identify the current view.",
      help: "Document must have a non-empty title",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html",
      target: ["title"],
      htmlSnippet: "<title>",
    }));
  }

  const htmlTag = firstMatch(clipped, /<html\b[^>]*>/i) ?? "";
  if (!attr(htmlTag, "lang")) {
    issues.push(issue({
      ruleId: "html-has-lang",
      impact: "serious",
      severity: "critical",
      wcagTags: ["wcag2a", "wcag311"],
      description: "The document language must be declared for screen readers and translation tools.",
      help: "The html element must have a lang attribute",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html",
      target: ["html"],
      htmlSnippet: htmlTag || "<html>",
    }));
  }

  for (const tag of tags(clipped, "img")) {
    if (attr(tag, "alt") == null && attr(tag, "role") !== "presentation") {
      issues.push(issue({
        ruleId: "image-alt",
        impact: "critical",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag111"],
        description: "Informative images need alternative text for people using assistive technology.",
        help: "Images must have alternate text",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html",
        target: [selectorFor(tag, "img")],
        htmlSnippet: tag,
      }));
    }
  }

  for (const button of pairedTags(clipped, "button")) {
    if (!accessibleName(button.openTag, button.content)) {
      issues.push(issue({
        ruleId: "button-name",
        impact: "critical",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag412"],
        description: "Buttons need an accessible name so their purpose is announced.",
        help: "Buttons must have discernible text",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html",
        target: [selectorFor(button.openTag, "button")],
        htmlSnippet: truncate(button.full),
      }));
    }
  }

  for (const input of tags(clipped, "input")) {
    const type = (attr(input, "type") ?? "text").toLowerCase();
    if (["hidden", "submit", "reset", "button"].includes(type)) continue;
    if (!hasLabel(input, clipped)) {
      issues.push(issue({
        ruleId: "label",
        impact: "serious",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag332", "wcag412"],
        description: "Form fields need visible or programmatic labels.",
        help: "Form elements must have labels",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html",
        target: [selectorFor(input, "input")],
        htmlSnippet: input,
      }));
    }
  }

  for (const controlName of ["select", "textarea"] as const) {
    for (const control of tags(clipped, controlName)) {
      if (!hasLabel(control, clipped)) {
        issues.push(issue({
          ruleId: "label",
          impact: "serious",
          severity: "critical",
          wcagTags: ["wcag2a", "wcag332", "wcag412"],
          description: "Form fields need visible or programmatic labels.",
          help: "Form elements must have labels",
          helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html",
          target: [selectorFor(control, controlName)],
          htmlSnippet: control,
        }));
      }
    }
  }

  for (const anchor of pairedTags(clipped, "a")) {
    if (!attr(anchor.openTag, "href")) continue;
    if (!accessibleName(anchor.openTag, anchor.content)) {
      issues.push(issue({
        ruleId: "link-name",
        impact: "serious",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag412", "wcag244"],
        description: "Links need accessible text that explains their destination or action.",
        help: "Links must have discernible text",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html",
        target: [selectorFor(anchor.openTag, "a")],
        htmlSnippet: truncate(anchor.full),
      }));
    }
  }

  const headingIssue = findHeadingOrderIssue(clipped);
  if (headingIssue) issues.push(headingIssue);

  if (!/<main\b/i.test(clipped) && !/role\s*=\s*["']main["']/i.test(clipped)) {
    issues.push(issue({
      ruleId: "landmark-one-main",
      impact: "moderate",
      severity: "minor",
      wcagTags: ["best-practice"],
      description: "A main landmark helps keyboard and screen-reader users jump to page content.",
      help: "Page should include a main landmark",
      helpUrl: "https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/",
      target: ["main"],
      htmlSnippet: snippetAroundBody(clipped),
      humanReviewRequired: true,
    }));
  }

  if (!/<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(clipped)) {
    issues.push(issue({
      ruleId: "meta-viewport",
      impact: "moderate",
      severity: "minor",
      wcagTags: ["best-practice"],
      description: "Responsive viewport metadata helps pages scale predictably on mobile devices.",
      help: "Page should define responsive viewport metadata",
      helpUrl: "https://www.w3.org/WAI/standards-guidelines/mobile/",
      target: ["meta[name=\"viewport\"]"],
      htmlSnippet: "<head>",
      humanReviewRequired: true,
    }));
  }

  return {
    title,
    issues: dedupeIssues([...issues, ...staticExpertHeuristics(clipped)]).map((i) => ({
      ...i,
      contexts: i.contexts ?? [{ viewport: "desktop", state: "initial" }],
    })),
    links: extractLinks(clipped, pageUrl),
  };
}

async function fetchHtmlSafely(url: string, startUrl: ValidatedUrl): Promise<FetchResult> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await validateFinalUrl(current, startUrl.origin);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "AccessOpsAI/1.0 accessibility scanner",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) break;
        current = new URL(location, current).toString();
        continue;
      }

      const contentType = res.headers.get("content-type");
      const html = contentType?.includes("html") ? await res.text() : "";
      return {
        url: res.url || current,
        statusCode: res.status,
        contentType,
        html: html.slice(0, MAX_HTML_BYTES),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("too_many_redirects");
}

function issue(input: {
  ruleId: string;
  impact: Impact;
  severity: Severity;
  wcagTags: string[];
  description: string;
  help: string;
  helpUrl?: string;
  target: string[];
  htmlSnippet?: string;
  humanReviewRequired?: boolean;
  contexts?: IssueContext[];
}): NormalizedIssue {
  return {
    ...input,
    htmlSnippet: input.htmlSnippet ? truncate(input.htmlSnippet) : undefined,
    failureSummary: input.help,
    humanReviewRequired: input.humanReviewRequired ?? false,
    contexts: input.contexts ?? [{ viewport: "desktop", state: "initial" }],
  };
}

function dedupeIssues(issues: NormalizedIssue[]): NormalizedIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.ruleId}:${i.target.join(",")}:${i.htmlSnippet ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tags(html: string, tagName: string): string[] {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))].map((m) => m[0]);
}

function pairedTags(html: string, tagName: string): Array<{ openTag: string; content: string; full: string }> {
  return [...html.matchAll(new RegExp(`(<${tagName}\\b[^>]*>)([\\s\\S]*?)<\\/${tagName}>`, "gi"))].map(
    (m) => ({ openTag: m[1], content: m[2], full: m[0] })
  );
}

function firstMatch(html: string, regex: RegExp): string | null {
  return html.match(regex)?.[0] ?? null;
}

function attr(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\s${escaped}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+)))?`, "i"));
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function accessibleName(openTag: string, content = ""): string {
  return (
    attr(openTag, "aria-label") ??
    attr(openTag, "title") ??
    attr(openTag, "value") ??
    textContent(content) ??
    imageAltText(content) ??
    ""
  ).trim();
}

function hasLabel(tag: string, html: string): boolean {
  if (attr(tag, "aria-label") || attr(tag, "aria-labelledby") || attr(tag, "title")) return true;
  const id = attr(tag, "id");
  if (id) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`<label\\b[^>]*for\\s*=\\s*["']${escaped}["'][^>]*>`, "i").test(html)) return true;
  }
  return false;
}

function selectorFor(tag: string, tagName: string): string {
  const id = attr(tag, "id");
  if (id) return `${tagName}#${cssIdent(id)}`;
  const name = attr(tag, "name");
  if (name) return `${tagName}[name="${name.replace(/"/g, '\\"')}"]`;
  const aria = attr(tag, "aria-label");
  if (aria) return `${tagName}[aria-label="${aria.slice(0, 40).replace(/"/g, '\\"')}"]`;
  return tagName;
}

function cssIdent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function textContent(input: string | null): string | null {
  if (!input) return null;
  const text = decodeEntities(input.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
  return text || null;
}

function imageAltText(html: string): string | null {
  for (const img of tags(html, "img")) {
    const alt = attr(img, "alt");
    if (alt?.trim()) return alt.trim();
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function findHeadingOrderIssue(html: string): NormalizedIssue | null {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => ({
    level: Number(m[1]),
    tag: m[0],
  }));
  let previous = 0;
  for (const heading of headings) {
    if (previous > 0 && heading.level > previous + 1) {
      return issue({
        ruleId: "heading-order",
        impact: "moderate",
        severity: "review",
        wcagTags: ["best-practice"],
        description: "Heading levels should increase by one level at a time to preserve page structure.",
        help: "Heading levels should not be skipped",
        helpUrl: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
        target: [`h${heading.level}`],
        htmlSnippet: heading.tag,
        humanReviewRequired: true,
      });
    }
    previous = heading.level;
  }
  return null;
}

function snippetAroundBody(html: string): string {
  return truncate(firstMatch(html, /<body\b[^>]*>/i) ?? "<body>");
}

function extractLinks(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  for (const anchor of tags(html, "a")) {
    const href = attr(anchor, "href");
    if (!href || href.startsWith("#") || /^mailto:|^tel:|^javascript:/i.test(href)) continue;
    try {
      out.push(new URL(href, pageUrl).toString());
    } catch {
      // Ignore malformed hrefs; they are not crawl candidates.
    }
  }
  return out;
}

function truncate(value: string, max = 4000): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
