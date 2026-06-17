/**
 * Multi-dimension site benchmark probe (independent of Percevia).
 * Captures performance, SEO, responsiveness, functional integrity, console
 * health, and link status. Pure measurement — scoring is done in the report.
 */
import { chromium } from "playwright";

const URL = process.argv[2] ?? "https://maitrico.online";

async function run() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const out = { url: URL };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    const failedReq = [];
    const resources = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
    page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
    page.on("requestfailed", (r) => failedReq.push({ url: r.url().slice(0, 120), err: r.failure()?.errorText }));
    page.on("response", (r) => {
      const h = r.headers();
      resources.push({
        type: r.request().resourceType(),
        status: r.status(),
        bytes: Number(h["content-length"] || 0),
      });
    });

    const t0 = Date.now();
    const resp = await page.goto(URL, { waitUntil: "load", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    out.wallClockMs = Date.now() - t0;
    out.status = resp?.status() ?? null;
    out.respHeaders = pick(resp?.headers() ?? {}, [
      "content-type", "strict-transport-security", "content-security-policy",
      "x-content-type-options", "x-frame-options", "referrer-policy",
      "permissions-policy", "cache-control", "server",
    ]);

    out.timing = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((p) => p.name === "first-contentful-paint");
      return n ? {
        ttfbMs: Math.round(n.responseStart),
        domContentLoadedMs: Math.round(n.domContentLoadedEventEnd),
        loadMs: Math.round(n.loadEventEnd),
        fcpMs: fcp ? Math.round(fcp.startTime) : null,
        transferBytes: n.transferSize,
        domNodes: document.getElementsByTagName("*").length,
      } : null;
    });

    // Resource weight rollup
    const weight = {};
    let total = 0, count = resources.length;
    for (const r of resources) { weight[r.type] = (weight[r.type] || 0) + r.bytes; total += r.bytes; }
    out.resources = { count, totalBytes: total, byType: weight, failed: failedReq };
    out.console = { errors: consoleErrors, pageErrors };

    // SEO / metadata
    out.seo = await page.evaluate(() => {
      const m = (sel, a = "content") => document.querySelector(sel)?.getAttribute(a) || null;
      return {
        title: document.title || null,
        titleLen: (document.title || "").length,
        metaDescription: m('meta[name="description"]'),
        canonical: m('link[rel="canonical"]', "href"),
        robots: m('meta[name="robots"]'),
        ogTitle: m('meta[property="og:title"]'),
        ogImage: m('meta[property="og:image"]'),
        twitterCard: m('meta[name="twitter:card"]'),
        favicon: !!document.querySelector('link[rel~="icon"]'),
        structuredData: document.querySelectorAll('script[type="application/ld+json"]').length,
        lang: document.documentElement.lang || null,
      };
    });

    // Functional integrity: links + interactive elements
    const links = await page.evaluate(() => {
      const as = Array.from(document.querySelectorAll("a[href]"));
      return {
        total: as.length,
        internal: as.map((a) => a.href).filter((h) => h.startsWith(location.origin)),
        external: as.filter((a) => !a.href.startsWith(location.origin) && a.href.startsWith("http")).length,
        anchors: as.filter((a) => a.getAttribute("href")?.startsWith("#")).length,
        buttons: document.querySelectorAll("button,[role=button]").length,
        forms: document.querySelectorAll("form").length,
      };
    });
    // Sample internal link health (HEAD, capped)
    const uniqueInternal = [...new Set(links.internal)].filter((u) => !u.includes("#")).slice(0, 12);
    const linkStatus = [];
    for (const u of uniqueInternal) {
      try {
        const r = await ctx.request.get(u, { timeout: 12000, maxRedirects: 3 });
        linkStatus.push({ url: u.slice(0, 100), status: r.status() });
      } catch {
        linkStatus.push({ url: u.slice(0, 100), status: "ERR" });
      }
    }
    out.functional = { ...links, internalSampled: uniqueInternal.length, linkStatus };

    // Responsive: mobile overflow + tap target sampling at 390px
    const mob = await ctx.newPage();
    await mob.setViewportSize({ width: 390, height: 844 });
    await mob.goto(URL, { waitUntil: "load", timeout: 45000 });
    await mob.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    out.responsive = await mob.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const tappables = Array.from(document.querySelectorAll("a,button,input,select,[role=button]"));
      let tooSmall = 0;
      for (const el of tappables) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24)) tooSmall++;
      }
      return {
        horizontalOverflowPx: overflow,
        tappableCount: tappables.length,
        smallTapTargets: tooSmall,
      };
    });
    await mob.close();
    await ctx.close();
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(out, null, 2));
}

function pick(obj, keys) {
  const o = {};
  for (const k of keys) if (obj[k] != null) o[k] = obj[k];
  return o;
}

run().catch((e) => { console.error("ERR", e); process.exit(1); });
