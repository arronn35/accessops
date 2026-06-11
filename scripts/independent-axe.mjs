/**
 * Independent accessibility baseline — deliberately NOT using any AccessOps
 * code. Raw axe-core via @axe-core/playwright + a few manual DOM metrics.
 * This is the ground truth we compare the AccessOps pipeline against.
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const URL = process.argv[2] ?? "https://maitrico.online";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

function tally(results) {
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0, null: 0 };
  let nodeCount = 0;
  for (const r of results) {
    const n = r.nodes.length;
    nodeCount += n;
    byImpact[r.impact ?? "null"] += n;
  }
  return { rules: results.length, nodes: nodeCount, byImpact };
}

async function run() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const out = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const resp = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

    out.url = page.url();
    out.status = resp?.status() ?? null;
    out.title = await page.title().catch(() => null);

    const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    out.axeVersion = axe.testEngine?.version ?? null;
    out.violations = tally(axe.violations);
    out.incomplete = tally(axe.incomplete);
    out.passes = axe.passes.length;
    out.violationRules = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
    out.incompleteRules = axe.incomplete.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));

    // Manual DOM metrics (independent of axe & AccessOps heuristics).
    out.dom = await page.evaluate(() => {
      const q = (s) => Array.from(document.querySelectorAll(s));
      const imgs = q("img");
      const inputs = q("input,select,textarea").filter((e) => {
        const t = (e.getAttribute("type") || "").toLowerCase();
        return !["hidden", "submit", "button", "reset", "image"].includes(t);
      });
      const labelledInput = (e) =>
        e.getAttribute("aria-label") ||
        e.getAttribute("aria-labelledby") ||
        e.getAttribute("title") ||
        (e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)) ||
        e.closest("label");
      const links = q("a[href]");
      const linkName = (a) =>
        (a.getAttribute("aria-label") || a.getAttribute("title") || a.textContent || "").trim();
      return {
        htmlLang: document.documentElement.getAttribute("lang") || null,
        title: document.title || null,
        h1: q("h1").length,
        headings: q("h1,h2,h3,h4,h5,h6").length,
        main: q("main,[role=main]").length,
        skipLink: q('a[href^="#"]').some((a) => /skip|main|content/i.test(a.getAttribute("href") || "")),
        viewportMeta: !!document.querySelector('meta[name="viewport"][content*="width=device-width"]'),
        images: imgs.length,
        imagesNoAlt: imgs.filter((i) => i.getAttribute("alt") == null).length,
        formControls: inputs.length,
        unlabeledControls: inputs.filter((i) => !labelledInput(i)).length,
        links: links.length,
        emptyLinks: links.filter((a) => !linkName(a)).length,
        ambiguousLinks: links.filter((a) => /^(click here|here|read more|learn more|more|details|this|link)$/i.test(linkName(a))).length,
        iframes: q("iframe").length,
        iframesNoTitle: q("iframe").filter((f) => !f.getAttribute("title") && !f.getAttribute("aria-label")).length,
        positiveTabindex: q("[tabindex]").filter((e) => Number(e.getAttribute("tabindex")) > 0).length,
        buttons: q("button").length,
        emptyButtons: q("button").filter((b) => !(b.getAttribute("aria-label") || b.getAttribute("title") || (b.textContent || "").trim())).length,
      };
    });
    await ctx.close();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(out, null, 2));
}

run().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
