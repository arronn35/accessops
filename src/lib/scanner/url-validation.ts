/**
 * URL validation and SSRF protection for AccessOps AI.
 *
 * This module is called twice:
 *   1. By the API on POST /api/scans — to reject obviously bad URLs early.
 *   2. By the worker, before navigation — and AGAIN after the browser
 *      reports the final resolved URL post-redirect, so we don't get
 *      tricked into hitting metadata endpoints via a 302.
 *
 * Threat model:
 *   - The user is potentially malicious (we run their URL).
 *   - DNS rebinding: we resolve hostnames at validation time and again
 *     at navigation / redirect validation time.
 *   - Loopback / private / link-local / cloud metadata endpoints must be
 *     unreachable.
 *
 * This is conservative on purpose. False positives are recoverable
 * (user picks a different URL); false negatives are not (data exfiltration
 * via SSRF). Loosen carefully.
 */
import { promises as dns } from "node:dns";
import { isIP } from "node:net";

export type UrlValidationError =
  | "invalid_url"
  | "scheme_blocked"
  | "host_required"
  | "host_too_long"
  | "url_too_long"
  | "private_ip"
  | "loopback"
  | "link_local"
  | "metadata_address"
  | "reserved_tld"
  | "dns_failed";

export class UrlValidationFailed extends Error {
  constructor(
    public readonly code: UrlValidationError,
    public readonly detail?: string
  ) {
    super(`URL validation failed: ${code}${detail ? ` (${detail})` : ""}`);
    this.name = "UrlValidationFailed";
  }
}

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MAX_URL_LENGTH = 2048;
const MAX_HOST_LENGTH = 253;

// TLDs / hostnames we always refuse.
const RESERVED_TLDS = new Set([
  "localhost",
  "local",
  "internal",
  "intranet",
  "private",
  "corp",
  "lan",
  "home",
  "test",
  "example",
  "invalid",
  "onion",
]);

// IPv4 CIDRs that are never publicly routable / are sensitive infra.
// Each entry is [networkInt, maskInt]. We compute integer comparisons.
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC1918
  ["100.64.0.0", 10], // shared address space / CGN
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local incl. AWS/GCP/Azure metadata 169.254.169.254
  ["172.16.0.0", 12], // RFC1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // RFC1918
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved (incl. 255.255.255.255 broadcast)
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return NaN;
  return parts.reduce((acc, p) => {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return NaN;
    return (acc << 8) + n;
  }, 0) >>> 0;
}

function ipv4InCidr(ipInt: number, cidr: [string, number]): boolean {
  const networkInt = ipv4ToInt(cidr[0]);
  if (Number.isNaN(networkInt)) return false;
  const maskBits = cidr[1];
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * Return true if the given IP literal (v4 or v6) must be blocked.
 */
export function isBlockedIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) {
    const n = ipv4ToInt(ip);
    if (Number.isNaN(n)) return true;
    return PRIVATE_IPV4_RANGES.some((cidr) => ipv4InCidr(n, cidr));
  }
  if (fam === 6) {
    const lower = ip.toLowerCase();
    // ::1, ::, link-local fe80::/10, ULA fc00::/7, IPv4-mapped 0:0:0:0:0:ffff:127.0.0.1
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true;
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // fc00::/7
    if (lower.startsWith("::ffff:")) {
      // IPv4-mapped — extract trailing IPv4 and recheck
      const v4 = lower.split(":").pop();
      if (v4 && isIP(v4) === 4) return isBlockedIp(v4);
      return true;
    }
    if (lower.startsWith("ff")) return true; // multicast
    return false;
  }
  // Not a valid IP literal
  return true;
}

/**
 * Resolve a hostname to IPs and ensure none are blocked.
 * Returns the resolved IPs for the caller to (optionally) pin the
 * Playwright navigation against.
 */
export async function resolveAndCheckHost(host: string): Promise<string[]> {
  // Strip surrounding brackets for IPv6 literals.
  const cleanHost = host.replace(/^\[|\]$/g, "");

  if (isIP(cleanHost)) {
    if (isBlockedIp(cleanHost)) {
      throw new UrlValidationFailed("private_ip", cleanHost);
    }
    return [cleanHost];
  }

  try {
    const records = await dns.lookup(cleanHost, { all: true, verbatim: true });
    if (records.length === 0) throw new UrlValidationFailed("dns_failed", cleanHost);
    for (const r of records) {
      if (isBlockedIp(r.address)) {
        throw new UrlValidationFailed("private_ip", `${cleanHost} → ${r.address}`);
      }
    }
    return records.map((r) => r.address);
  } catch (err) {
    if (err instanceof UrlValidationFailed) throw err;
    throw new UrlValidationFailed("dns_failed", (err as Error).message);
  }
}

export interface ValidatedUrl {
  raw: string;
  normalized: string; // canonical form we'll persist
  host: string;
  origin: string;
  ips: string[];
}

/**
 * Validate and normalize a URL.
 *
 * `resolveDns`: when true (default in worker), perform a real DNS lookup
 * and reject if any resolved IP is private/internal. When false (in the
 * web API path), we still reject obvious bad strings and IP literals but
 * defer the DNS resolution to the worker to keep the API endpoint fast.
 */
export async function validateUrl(
  input: string,
  opts: { resolveDns?: boolean } = {}
): Promise<ValidatedUrl> {
  if (typeof input !== "string" || input.length === 0) {
    throw new UrlValidationFailed("invalid_url", "empty");
  }
  if (input.length > MAX_URL_LENGTH) {
    throw new UrlValidationFailed("url_too_long", String(input.length));
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new UrlValidationFailed("invalid_url");
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new UrlValidationFailed("scheme_blocked", parsed.protocol);
  }

  if (!parsed.hostname) {
    throw new UrlValidationFailed("host_required");
  }
  if (parsed.hostname.length > MAX_HOST_LENGTH) {
    throw new UrlValidationFailed("host_too_long");
  }

  const host = parsed.hostname.toLowerCase();
  const lastLabel = host.split(".").pop() ?? "";
  if (RESERVED_TLDS.has(host) || RESERVED_TLDS.has(lastLabel)) {
    throw new UrlValidationFailed("reserved_tld", host);
  }

  // The cloud-metadata IP is the most common SSRF target — flag it
  // with a specific code BEFORE the generic private-IP guard so error
  // surfaces stay informative.
  if (host === "169.254.169.254") {
    throw new UrlValidationFailed("metadata_address", host);
  }

  // If the host is an IP literal, check it synchronously.
  if (isIP(host) && isBlockedIp(host)) {
    throw new UrlValidationFailed("private_ip", host);
  }

  // Strip default ports and fragments; keep query strings.
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  const normalized = parsed.toString();

  let ips: string[] = [];
  if (opts.resolveDns) {
    ips = await resolveAndCheckHost(host);
  }

  return {
    raw: input,
    normalized,
    host,
    origin: parsed.origin,
    ips,
  };
}

/**
 * Re-validate the final URL after redirects. Use this in the worker
 * once Playwright reports `page.url()` after navigation.
 */
export async function validateFinalUrl(finalUrl: string, expectedOrigin?: string) {
  const v = await validateUrl(finalUrl, { resolveDns: true });
  if (expectedOrigin && v.origin !== expectedOrigin) {
    // Cross-origin redirect — re-validate IPs of the new host.
    await resolveAndCheckHost(v.host);
  }
  return v;
}
