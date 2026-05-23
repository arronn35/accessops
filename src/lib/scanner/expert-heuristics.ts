import type { NormalizedIssue } from "./types";

type HeuristicFinding = Omit<NormalizedIssue, "impact" | "severity"> & {
  impact: NormalizedIssue["impact"];
  severity: NormalizedIssue["severity"];
};

export function normalizeHeuristicFindings(
  findings: HeuristicFinding[]
): NormalizedIssue[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.ruleId}:${finding.target.join(",")}:${finding.htmlSnippet ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function staticExpertHeuristics(html: string): NormalizedIssue[] {
  const findings: HeuristicFinding[] = [];
  const clipped = html.slice(0, 1_500_000);
  const ids = [...clipped.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);

  for (const id of new Set(duplicateIds).values()) {
    findings.push(makeFinding({
      ruleId: "duplicate-id",
      impact: "serious",
      severity: "critical",
      wcagTags: ["wcag2a", "wcag412"],
      description: "Duplicate IDs can break label, description, and ARIA references.",
      help: "IDs used by interactive and labelled elements must be unique",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html",
      target: [`#${id}`],
      htmlSnippet: `id="${id}"`,
    }));
  }

  if (/<[^>]+\stabindex\s*=\s*["']?[1-9]\d*/i.test(clipped)) {
    findings.push(makeFinding({
      ruleId: "positive-tabindex",
      impact: "serious",
      severity: "review",
      wcagTags: ["best-practice", "wcag2a", "wcag243"],
      description: "Positive tabindex values create a focus order that can differ from the visual and DOM order.",
      help: "Avoid positive tabindex values",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html",
      target: ["[tabindex]"],
      htmlSnippet: clipped.match(/<[^>]+\stabindex\s*=\s*["']?[1-9]\d*[^>]*>/i)?.[0],
      humanReviewRequired: true,
    }));
  }

  if (!/<a\b[^>]*href\s*=\s*["']#(?:main|content|skip|skip-to-content)["'][^>]*>/i.test(clipped)) {
    findings.push(makeFinding({
      ruleId: "skip-link",
      impact: "moderate",
      severity: "review",
      wcagTags: ["best-practice", "wcag2a", "wcag241"],
      description: "A skip link helps keyboard users bypass repeated navigation.",
      help: "Page should provide a skip link to main content",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html",
      target: ["a[href^=\"#\"]"],
      htmlSnippet: "<body>",
      humanReviewRequired: true,
    }));
  }

  for (const iframe of [...clipped.matchAll(/<iframe\b[^>]*>/gi)].map((m) => m[0])) {
    if (!/\stitle\s*=/i.test(iframe) && !/\saria-label\s*=/i.test(iframe)) {
      findings.push(makeFinding({
        ruleId: "frame-title",
        impact: "serious",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag412"],
        description: "Frames need a title or accessible name so assistive technology users can identify their purpose.",
        help: "Frames must have an accessible name",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html",
        target: ["iframe"],
        htmlSnippet: iframe,
      }));
    }
  }

  addDocumentMetadataFindings(findings, clipped);
  addStructureFindings(findings, clipped);
  addImageFindings(findings, clipped);
  addNameQualityFindings(findings, clipped);
  addFormFindings(findings, clipped);

  return normalizeHeuristicFindings(findings);
}

function addDocumentMetadataFindings(findings: HeuristicFinding[], html: string) {
  const title = textOfFirstTag(html, "title");
  if (!/<html\b[^>]*\blang\s*=/i.test(html)) {
    findings.push(makeFinding({
      ruleId: "html-has-lang",
      impact: "serious",
      severity: "critical",
      wcagTags: ["wcag2a", "wcag311"],
      description: "The root html element does not declare a page language.",
      help: "Set a valid lang attribute on the html element",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html",
      target: ["html"],
      htmlSnippet: html.match(/<html\b[^>]*>/i)?.[0],
    }));
  }

  if (!title || isGenericName(title)) {
    findings.push(makeFinding({
      ruleId: "document-title-quality",
      impact: "serious",
      severity: "critical",
      wcagTags: ["wcag2a", "wcag242"],
      description: "A descriptive page title is required for orientation and browser/tab navigation.",
      help: "Give every page a unique, descriptive title",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html",
      target: ["title"],
      htmlSnippet: title ? `<title>${title}</title>` : undefined,
      humanReviewRequired: Boolean(title),
    }));
  }

  if (!/<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*content\s*=\s*["'][^"']*width\s*=\s*device-width/i.test(html)) {
    findings.push(makeFinding({
      ruleId: "meta-viewport-responsive",
      impact: "moderate",
      severity: "review",
      wcagTags: ["best-practice", "wcag21aa", "wcag1410"],
      description: "Missing responsive viewport metadata can make pages hard to zoom and use on mobile.",
      help: "Add a responsive viewport meta tag",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/reflow.html",
      target: ["meta[name=\"viewport\"]"],
      htmlSnippet: "<head>",
      humanReviewRequired: true,
    }));
  }
}

function addStructureFindings(findings: HeuristicFinding[], html: string) {
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) {
    findings.push(makeFinding({
      ruleId: "heading-h1-quality",
      impact: "moderate",
      severity: "review",
      wcagTags: ["best-practice", "wcag2aa", "wcag246"],
      description: h1Count === 0
        ? "The page does not expose a primary H1 heading."
        : "The page exposes multiple H1 headings, which can make the outline unclear.",
      help: "Use one clear H1 that describes the page purpose",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html",
      target: ["h1"],
      htmlSnippet: html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0],
      humanReviewRequired: true,
    }));
  }

  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ level: Number(m[1]), html: m[0] }));
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i].level > headings[i - 1].level + 1) {
      findings.push(makeFinding({
        ruleId: "heading-order",
        impact: "moderate",
        severity: "review",
        wcagTags: ["best-practice", "wcag2aa", "wcag246"],
        description: `Heading level jumps from H${headings[i - 1].level} to H${headings[i].level}.`,
        help: "Keep heading levels in a logical nested order",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html",
        target: [`h${headings[i].level}`],
        htmlSnippet: headings[i].html,
        humanReviewRequired: true,
      }));
      break;
    }
  }

  if (!/<main\b|role\s*=\s*["']main["']/i.test(html)) {
    findings.push(makeFinding({
      ruleId: "main-landmark",
      impact: "moderate",
      severity: "review",
      wcagTags: ["best-practice", "wcag2a", "wcag241"],
      description: "The page does not expose a main landmark.",
      help: "Wrap primary content in a main element or role=\"main\" landmark",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html",
      target: ["main"],
      htmlSnippet: "<body>",
      humanReviewRequired: true,
    }));
  }
}

function addImageFindings(findings: HeuristicFinding[], html: string) {
  for (const img of [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])) {
    const alt = attrValue(img, "alt");
    if (alt == null) {
      findings.push(makeFinding({
        ruleId: "image-alt-missing",
        impact: "serious",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag111"],
        description: "An image does not provide alternative text.",
        help: "Informative images must provide useful alternative text",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html",
        target: ["img"],
        htmlSnippet: img,
      }));
      continue;
    }
    if (alt && isGenericImageAlt(alt)) {
      findings.push(makeFinding({
        ruleId: "image-alt-quality",
        impact: "moderate",
        severity: "review",
        wcagTags: ["wcag2a", "wcag111"],
        description: "An image has low-quality or filename-like alternative text.",
        help: "Alternative text should communicate the image purpose, not a filename or generic label",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html",
        target: ["img"],
        htmlSnippet: img,
        humanReviewRequired: true,
      }));
    }
  }
}

function addNameQualityFindings(findings: HeuristicFinding[], html: string) {
  for (const link of tagBlocks(html, "a")) {
    if (!/\bhref\s*=/i.test(link.openingTag)) continue;
    const name = accessibleName(link.openingTag, link.innerHtml);
    if (!name) {
      findings.push(makeFinding({
        ruleId: "link-name-empty",
        impact: "serious",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag244", "wcag412"],
        description: "A link has no accessible name.",
        help: "Links must expose meaningful accessible names",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html",
        target: ["a[href]"],
        htmlSnippet: link.html,
      }));
    } else if (isAmbiguousLinkName(name)) {
      findings.push(makeFinding({
        ruleId: "link-name-ambiguous",
        impact: "moderate",
        severity: "review",
        wcagTags: ["wcag2a", "wcag244"],
        description: "A link uses an ambiguous label that may not explain its destination.",
        help: "Use link text that describes the destination or action",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html",
        target: ["a[href]"],
        htmlSnippet: link.html,
        humanReviewRequired: true,
      }));
    }
  }

  for (const button of tagBlocks(html, "button")) {
    const name = accessibleName(button.openingTag, button.innerHtml);
    if (!name || isGenericName(name)) {
      findings.push(makeFinding({
        ruleId: "button-name-quality",
        impact: "serious",
        severity: name ? "review" : "critical",
        wcagTags: ["wcag2a", "wcag412"],
        description: name
          ? "A button exposes a generic accessible name."
          : "A button has no accessible name.",
        help: "Buttons must expose a clear action label",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html",
        target: ["button"],
        htmlSnippet: button.html,
        humanReviewRequired: Boolean(name),
      }));
    }
  }
}

function addFormFindings(findings: HeuristicFinding[], html: string) {
  const labelsFor = new Set(
    [...html.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>/gi)]
      .map((m) => m[1])
  );
  const controls = [...html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)].map((m) => m[0]);
  for (const control of controls) {
    const type = (attrValue(control, "type") ?? "").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
    const id = attrValue(control, "id");
    const hasProgrammaticName =
      attrValue(control, "aria-label") ||
      attrValue(control, "aria-labelledby") ||
      attrValue(control, "title") ||
      (id && labelsFor.has(id));
    if (!hasProgrammaticName) {
      findings.push(makeFinding({
        ruleId: "form-control-label",
        impact: "serious",
        severity: "critical",
        wcagTags: ["wcag2a", "wcag332", "wcag412"],
        description: "A form control does not have a detectable label association.",
        help: "Associate every input, select, and textarea with a visible or programmatic label",
        helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html",
        target: [control.match(/^<(\w+)/i)?.[1] ?? "input"],
        htmlSnippet: control,
      }));
    }
  }
}

export function makeFinding(input: {
  ruleId: string;
  impact: NormalizedIssue["impact"];
  severity: NormalizedIssue["severity"];
  wcagTags: string[];
  description: string;
  help: string;
  helpUrl?: string;
  target: string[];
  htmlSnippet?: string;
  humanReviewRequired?: boolean;
}): HeuristicFinding {
  return {
    ...input,
    htmlSnippet: input.htmlSnippet?.slice(0, 4000),
    failureSummary: input.help,
    humanReviewRequired: input.humanReviewRequired ?? false,
  };
}

function tagBlocks(html: string, tagName: "a" | "button") {
  const re = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return [...html.matchAll(re)].map((m) => ({
    html: m[0].slice(0, 4000),
    openingTag: `<${tagName}${m[1]}>`,
    innerHtml: m[2],
  }));
}

function textOfFirstTag(html: string, tagName: string): string | null {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? cleanText(match[1]) : null;
}

function attrValue(tag: string, name: string): string | null {
  const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  if (quoted) return decodeEntities(quoted[1]).trim();
  const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return bare ? decodeEntities(bare[1]).trim() : null;
}

function accessibleName(openingTag: string, innerHtml: string): string {
  return (
    attrValue(openingTag, "aria-label") ||
    attrValue(openingTag, "title") ||
    attrValue(innerHtml, "alt") ||
    cleanText(innerHtml)
  );
}

function cleanText(value: string): string {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function isGenericName(value: string): boolean {
  return /^(home|page|untitled|document|submit|button|click|go|ok|yes|no|menu|open|close)$/i.test(value.trim());
}

function isGenericImageAlt(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    /^(image|photo|picture|graphic|icon|logo|img)$/i.test(normalized) ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(normalized) ||
    /^dsc[_-]?\d+/.test(normalized)
  );
}

function isAmbiguousLinkName(value: string): boolean {
  return /^(click here|here|read more|learn more|more|details|this|link)$/i.test(value.trim());
}
