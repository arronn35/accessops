#!/usr/bin/env node

import fs from "node:fs/promises";

const DEFAULT_INPUT = "docs/marketing/lead-seeds.json";
const DEFAULT_JSON_OUTPUT = "docs/marketing/leads.json";
const DEFAULT_CSV_OUTPUT = "docs/marketing/leads.csv";
const DEFAULT_DATE = "2026-06-27";

const CONTACT_PATHS = [
  "",
  "/contact",
  "/contact-us",
  "/contact/",
  "/contacts",
  "/get-in-touch",
  "/say-hello",
  "/hello",
  "/new-business",
  "/iletisim",
  "/tr/iletisim",
  "/en/contact",
  "/en/contact-us",
  "/en/get-in-touch",
  "/kontakt",
  "/kontakt/",
  "/kontaktai",
  "/kontaktieren",
  "/kontakt-os",
  "/contatti",
  "/contato",
  "/contacto",
  "/es/contacto",
  "/fr/contact",
  "/nl/contact",
  "/de/kontakt",
  "/impressum",
  "/about",
  "/about-us",
  "/studio",
  "/agency",
  "/pages/contact",
  "/pages/contact-us",
  "/help",
  "/support",
  "/musteri-hizmetleri",
];

const GOOD_ROLE_PREFIXES = [
  "hello",
  "hi",
  "info",
  "contact",
  "partnerships",
  "partner",
  "agency",
  "marketing",
  "sales",
  "business",
  "newbusiness",
  "growth",
  "team",
  "office",
  "go",
  "start",
  "office",
  "web",
  "studio",
  "merhaba",
  "hola",
  "bonjour",
  "hej",
];

const SUPPORT_PREFIXES = [
  "support",
  "help",
  "care",
  "service",
  "customer",
  "customerservice",
  "musteri",
  "destek",
  "klantenservice",
  "kundeservice",
  "serviceclient",
];

const REJECT_PREFIXES = [
  "no-reply",
  "noreply",
  "donotreply",
  "do-not-reply",
  "example",
  "privacy",
  "legal",
  "dpo",
  "kvkk",
  "careers",
  "career",
  "jobs",
  "job",
  "hr",
  "recruitment",
  "talent",
  "abuse",
  "postmaster",
  "webmaster",
];

const REJECT_DOMAINS = new Set([
  "email.com",
  "example.com",
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
]);

const HOST_STOP_LABELS = new Set([
  "www",
  "com",
  "co",
  "net",
  "org",
  "io",
  "ai",
  "app",
  "shop",
  "store",
  "care",
  "digital",
  "agency",
  "tr",
  "de",
  "nl",
  "fr",
  "es",
  "pl",
  "cz",
  "dk",
  "se",
  "eu",
  "at",
  "io",
]);

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizeWebsite(input) {
  const value = input.trim();
  return /^https?:\/\//i.test(value) ? value.replace(/\/+$/, "") : `https://${value.replace(/\/+$/, "")}`;
}

function originOf(website) {
  return new URL(normalizeWebsite(website)).origin;
}

function withPath(website, path) {
  return `${originOf(website)}${path}`;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&commat;/g, "@");
}

function decodeCloudflareEmail(hex) {
  const key = Number.parseInt(hex.slice(0, 2), 16);
  let email = "";
  for (let i = 2; i < hex.length; i += 2) {
    email += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return email;
}

function cleanEmail(email) {
  return decodeHtmlEntities(email)
    .replace(/^mailto:/i, "")
    .replace(/[?].*$/, "")
    .trim()
    .toLowerCase();
}

function emailPrefix(email) {
  return email.split("@")[0] ?? "";
}

function emailDomain(email) {
  return email.split("@")[1] ?? "";
}

function rootToken(hostOrDomain) {
  const labels = hostOrDomain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(".")
    .filter((label) => label && !HOST_STOP_LABELS.has(label));
  return labels[labels.length - 1] ?? "";
}

function compact(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function emailType(email) {
  const prefix = emailPrefix(email);
  if (GOOD_ROLE_PREFIXES.includes(prefix)) {
    if (["sales", "business", "newbusiness", "growth"].includes(prefix)) return "sales";
    if (["partnerships", "partner"].includes(prefix)) return "partnerships";
    return "role";
  }
  if (SUPPORT_PREFIXES.some((p) => prefix === p || prefix.startsWith(`${p}.`))) return "support";
  return "personal_public";
}

function emailRank(email) {
  const type = emailType(email);
  const prefix = emailPrefix(email);
  if (["hello", "hi", "contact", "info", "go"].includes(prefix)) return 100;
  if (type === "partnerships") return 95;
  if (type === "sales") return 90;
  if (type === "role") return 85;
  if (type === "support") return 55;
  return 65;
}

function isRejectedEmail(email) {
  const prefix = emailPrefix(email);
  const domain = emailDomain(email);
  if (!email.includes("@")) return true;
  if (REJECT_PREFIXES.includes(prefix)) return true;
  if (REJECT_DOMAINS.has(domain)) return true;
  if (email.endsWith(".png") || email.endsWith(".jpg") || email.endsWith(".webp")) return true;
  if (email.includes("@example.")) return true;
  if (email.length > 320) return true;
  return false;
}

function matchesSeedDomain(seed, email) {
  const host = new URL(normalizeWebsite(seed.website)).hostname;
  const domain = emailDomain(email);
  const hostRoot = compact(rootToken(host));
  const emailRoot = compact(rootToken(domain));
  const companyRoot = compact(seed.company_name);

  if (!hostRoot || !emailRoot) return false;
  if (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`)) return true;
  if (hostRoot.includes(emailRoot) || emailRoot.includes(hostRoot)) return true;
  if (companyRoot.includes(emailRoot) || emailRoot.includes(companyRoot.slice(0, Math.min(companyRoot.length, 10)))) return true;
  return false;
}

function extractEmails(html) {
  const decoded = decodeHtmlEntities(html);
  const found = new Set();

  for (const match of decoded.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)) {
    found.add(decodeCloudflareEmail(match[1]));
  }

  for (const match of decoded.matchAll(/mailto:([^"'<> \t\r\n]+)/gi)) {
    found.add(cleanEmail(match[1]));
  }

  for (const match of decoded.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    found.add(cleanEmail(match[0]));
  }

  return [...found].filter((email) => !isRejectedEmail(email));
}

function inferPlatform(seed, html) {
  if (seed.platform_hint && seed.platform_hint !== "unknown") return seed.platform_hint;
  const lower = html.toLowerCase();
  if (lower.includes("cdn.shopify.com") || lower.includes("myshopify")) return "Shopify";
  if (lower.includes("woocommerce")) return "WooCommerce";
  if (lower.includes("magento") || lower.includes("adobe commerce")) return "Magento";
  if (lower.includes("webflow")) return "Webflow";
  if (lower.includes("framer")) return "Framer";
  if (lower.includes("next.js") || lower.includes("__next")) return "Next.js/custom";
  return seed.platform_hint || "unknown";
}

function bestEmail(emails) {
  return [...emails]
    .filter((email) => emailType(email) !== "personal_public")
    .sort((a, b) => emailRank(b) - emailRank(a) || a.localeCompare(b))[0] ?? null;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "PerceviaAI-LeadResearch/1.0 (+public contact verification)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text") && !contentType.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function discover(seed) {
  const urls = [seed.source_url, ...CONTACT_PATHS.map((path) => withPath(seed.website, path))]
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index);

  let platform = seed.platform_hint || "unknown";

  for (const url of urls) {
    const html = await fetchText(url);
    if (!html) continue;
    platform = inferPlatform(seed, html);
    const emails = extractEmails(html).filter((email) => matchesSeedDomain(seed, email));
    const selectedEmail = bestEmail(emails);
    if (!selectedEmail) continue;

    return {
      email: selectedEmail,
      email_type: emailType(selectedEmail),
      source_url: url,
      source_context: `Public email found on ${url}`,
      platform_hint: platform,
    };
  }

  return null;
}

function countryCode(country) {
  return country
    .split(/[\s/-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function scoreLead(seed, discovered) {
  let score = seed.fit_score_base ?? (seed.segment === "agency" ? 72 : 68);
  const type = discovered.email_type;
  if (type === "role" || type === "sales" || type === "partnerships") score += 12;
  if (type === "support") score -= 8;
  if (seed.segment === "agency" && /shopify|e-commerce|commerce|webflow|woocommerce|magento/i.test(seed.personalization_hook)) {
    score += 8;
  }
  if (seed.segment === "ecommerce" && /checkout|product|store|storefront|e-commerce|eu/i.test(seed.personalization_hook)) {
    score += 8;
  }
  return Math.max(1, Math.min(100, score));
}

function complianceNotes(discovered) {
  if (discovered.email_type === "support") {
    return "Public support/customer-service address; use cautiously and prefer a business inquiry route if found.";
  }
  if (discovered.email_type === "personal_public") {
    return "Publicly listed named/business email; do not use if source context suggests non-sales use.";
  }
  return "Public role/business email; suitable for low-volume B2B outreach with opt-out.";
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function main() {
  const inputPath = argValue("--input", DEFAULT_INPUT);
  const jsonOutputPath = argValue("--json", DEFAULT_JSON_OUTPUT);
  const csvOutputPath = argValue("--csv", DEFAULT_CSV_OUTPUT);
  const verifiedDate = argValue("--date", DEFAULT_DATE);

  const seeds = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const counters = { agency: 0, ecommerce: 0 };
  const discoveredRows = await mapLimit(seeds, 8, async (seed) => {
    const discovered = await discover(seed);
    if (!discovered) {
      console.error(`no-email\t${seed.company_name}\t${seed.website}`);
      return null;
    }

    return { seed, discovered };
  });

  const rows = [];

  for (const row of discoveredRows.filter(Boolean)) {
    const { seed, discovered } = row;
    const segment = seed.segment;
    counters[segment] += 1;
    const leadId = `${segment === "agency" ? "AG" : "EC"}-${countryCode(seed.country)}-${String(counters[segment]).padStart(3, "0")}`;

    rows.push({
      lead_id: leadId,
      company_name: seed.company_name,
      website: normalizeWebsite(seed.website),
      country: seed.country,
      segment,
      platform_hint: discovered.platform_hint,
      contact_email: discovered.email,
      email_type: discovered.email_type,
      source_url: discovered.source_url,
      source_context: discovered.source_context,
      fit_score: scoreLead(seed, discovered),
      personalization_hook: seed.personalization_hook,
      outreach_angle: seed.outreach_angle,
      status: "not_contacted",
      compliance_notes: complianceNotes(discovered),
      last_verified_at: verifiedDate,
    });

    console.error(`ok\t${leadId}\t${seed.company_name}\t${discovered.email}`);
  }

  const headers = [
    "lead_id",
    "company_name",
    "website",
    "country",
    "segment",
    "platform_hint",
    "contact_email",
    "email_type",
    "source_url",
    "source_context",
    "fit_score",
    "personalization_hook",
    "outreach_angle",
    "status",
    "compliance_notes",
    "last_verified_at",
  ];

  await fs.writeFile(jsonOutputPath, `${JSON.stringify(rows, null, 2)}\n`);
  await fs.writeFile(
    csvOutputPath,
    `${headers.join(",")}\n${rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")).join("\n")}\n`,
  );

  console.error(`wrote\t${rows.length}\t${jsonOutputPath}\t${csvOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
