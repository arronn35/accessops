/**
 * F15: indexing policy has to be coherent across three places that can drift
 * apart — the sitemap (what we ask crawlers to fetch), robots.txt (what we
 * forbid), and each page's own metadata (canonical / noindex).
 *
 * The dangerous combination is a URL that is both advertised and forbidden, or
 * a tokenised URL that is neither. These assert the three agree.
 */
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { canonical, NOINDEX } from "./canonical";

describe("canonical helper", () => {
  it("emits a relative canonical, resolved by metadataBase", () => {
    // Relative keeps the origin in one place (NEXT_PUBLIC_APP_URL), so moving
    // domains does not mean editing every page.
    expect(canonical("/pricing")).toEqual({ alternates: { canonical: "/pricing" } });
  });

  it("does not claim hreflang alternates", () => {
    // Both languages are served from the same URL via a cookie, so there is no
    // per-language URL to point hreflang at. Claiming one would be a lie.
    expect(canonical("/")).not.toHaveProperty("alternates.languages");
  });

  it("blocks both indexing and link-following for private pages", () => {
    expect(NOINDEX.robots).toEqual({ index: false, follow: false });
  });
});

describe("sitemap and robots agree", () => {
  const entries = sitemap();
  const rules = robots().rules;
  const disallow = (Array.isArray(rules) ? rules[0] : rules).disallow as string[];

  it("advertises a non-empty set of public URLs", () => {
    expect(entries.length).toBeGreaterThan(5);
  });

  it("never advertises a URL that robots.txt forbids", () => {
    const conflicting = entries
      .map((entry) => new URL(entry.url).pathname)
      .filter((path) => disallow.some((rule) => path.startsWith(rule)));

    expect(
      conflicting,
      `These URLs are in the sitemap and disallowed at the same time:\n  ${conflicting.join("\n  ")}`
    ).toEqual([]);
  });

  it("forbids every tokenised or per-user surface", () => {
    // Each of these URLs is, or contains, a credential.
    for (const path of ["/app", "/api", "/r/", "/statement/", "/invite/", "/workspace/"]) {
      expect(disallow, `${path} must be disallowed`).toContain(path);
    }
  });

  it("has no duplicate sitemap entries", () => {
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("uses one origin for every advertised URL", () => {
    const origins = new Set(entries.map((e) => new URL(e.url).origin));
    expect(origins.size).toBe(1);
  });
});
