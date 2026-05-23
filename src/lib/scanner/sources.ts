import { validateFinalUrl, validateUrl } from "./url-validation";

const MAX_SITEMAP_BYTES = 2_000_000;
const SITEMAP_TIMEOUT_MS = 8_000;
const MAX_SITEMAP_DEPTH = 2;

export interface ScanSourceConfig {
  baseUrl: string;
  scanType: "single" | "multi" | "sitemap" | "manual";
  maxPages: number;
  sourceUrls?: string[];
  sitemapUrl?: string | null;
}

export interface ScanSourcePlan {
  baseUrl: string;
  origin: string;
  targets: string[];
  discoverySource: "single" | "crawl" | "sitemap" | "manual";
  sitemapUrl?: string | null;
}

export async function resolveScanSourcePlan(
  config: ScanSourceConfig
): Promise<ScanSourcePlan> {
  const base = await validateUrl(config.baseUrl, { resolveDns: true });
  const maxPages = Math.max(1, config.maxPages);

  if (config.scanType === "manual") {
    const explicit = await normalizeExplicitUrls(
      config.sourceUrls ?? [],
      base.origin,
      maxPages
    );
    return {
      baseUrl: base.normalized,
      origin: base.origin,
      targets: explicit.length ? explicit : [base.normalized],
      discoverySource: "manual",
    };
  }

  if (config.scanType === "sitemap") {
    const sitemapUrl =
      config.sitemapUrl?.trim() || new URL("/sitemap.xml", base.origin).toString();
    const sitemapCandidates = config.sitemapUrl?.trim()
      ? [sitemapUrl]
      : [...(await discoverRobotsSitemaps(base.origin)), sitemapUrl];
    const targets: string[] = [];
    const seen = new Set<string>();
    for (const candidate of sitemapCandidates) {
      if (targets.length >= maxPages) break;
      const discovered = await discoverSitemapUrls(candidate, base.origin, maxPages - targets.length);
      for (const url of discovered) {
        if (seen.has(url)) continue;
        seen.add(url);
        targets.push(url);
      }
    }
    return {
      baseUrl: base.normalized,
      origin: base.origin,
      targets: targets.length ? targets : [base.normalized],
      discoverySource: "sitemap",
      sitemapUrl,
    };
  }

  return {
    baseUrl: base.normalized,
    origin: base.origin,
    targets: [base.normalized],
    discoverySource: config.scanType === "single" ? "single" : "crawl",
  };
}

export function canonicalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  const params = new URLSearchParams(url.search);
  for (const key of [...params.keys()]) {
    if (
      /^utm_/i.test(key) ||
      key === "fbclid" ||
      key === "gclid" ||
      key === "msclkid"
    ) {
      params.delete(key);
    }
  }
  url.search = params.toString();
  return url.toString();
}

export function sameOriginCanonicalUrl(
  href: string,
  baseUrl: string,
  expectedOrigin: string
): string | null {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin !== expectedOrigin) return null;
    return canonicalizeUrl(url.toString());
  } catch {
    return null;
  }
}

async function normalizeExplicitUrls(
  urls: string[],
  origin: string,
  maxPages: number
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    if (out.length >= maxPages) break;
    const candidate = raw.trim();
    if (!candidate) continue;
    const validated = await validateUrl(candidate, { resolveDns: true });
    if (validated.origin !== origin) continue;
    const canonical = canonicalizeUrl(validated.normalized);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }

  return out;
}

async function discoverSitemapUrls(
  sitemapUrl: string,
  origin: string,
  maxPages: number
): Promise<string[]> {
  const seenSitemaps = new Set<string>();
  const seenUrls = new Set<string>();
  const urls: string[] = [];

  async function visit(url: string, depth: number) {
    if (urls.length >= maxPages || depth > MAX_SITEMAP_DEPTH) return;
    const validated = await validateUrl(url, { resolveDns: true });
    if (validated.origin !== origin) return;
    const sitemap = canonicalizeUrl(validated.normalized);
    if (seenSitemaps.has(sitemap)) return;
    seenSitemaps.add(sitemap);

    const xml = await fetchText(sitemap, origin);
    for (const nested of extractSitemapLocations(xml, "sitemap")) {
      if (urls.length >= maxPages) break;
      await visit(nested, depth + 1);
    }
    for (const loc of extractSitemapLocations(xml, "url")) {
      if (urls.length >= maxPages) break;
      const canonical = sameOriginCanonicalUrl(loc, sitemap, origin);
      if (!canonical || seenUrls.has(canonical)) continue;
      seenUrls.add(canonical);
      urls.push(canonical);
    }
  }

  await visit(sitemapUrl, 0);
  return urls;
}

async function discoverRobotsSitemaps(origin: string): Promise<string[]> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const text = await fetchText(robotsUrl, origin).catch(() => "");
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*sitemap\s*:\s*(.+)\s*$/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => sameOriginCanonicalUrl(value, robotsUrl, origin))
    .filter((value): value is string => Boolean(value));
}

async function fetchText(url: string, expectedOrigin: string): Promise<string> {
  await validateFinalUrl(url, expectedOrigin);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "AccessOpsAI/1.0 sitemap scanner",
        accept: "application/xml,text/xml,text/plain,*/*",
      },
    });
    await validateFinalUrl(res.url || url, expectedOrigin);
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, MAX_SITEMAP_BYTES);
  } finally {
    clearTimeout(timeout);
  }
}

function extractSitemapLocations(xml: string, parentTag: "url" | "sitemap"): string[] {
  const blockRe = new RegExp(`<${parentTag}\\b[^>]*>([\\s\\S]*?)<\\/${parentTag}>`, "gi");
  return [...xml.matchAll(blockRe)]
    .map((m) => {
      const loc = m[1].match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1];
      return loc ? decodeXml(loc.trim()) : null;
    })
    .filter((v): v is string => Boolean(v));
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}
