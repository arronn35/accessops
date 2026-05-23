import { describe, expect, it, vi, afterEach } from "vitest";
import {
  canonicalizeUrl,
  resolveScanSourcePlan,
  sameOriginCanonicalUrl,
} from "./sources";

vi.mock("./url-validation", () => ({
  validateUrl: vi.fn(async (input: string) => {
    const url = new URL(input);
    url.hash = "";
    return {
      raw: input,
      normalized: url.toString(),
      host: url.hostname,
      origin: url.origin,
      ips: ["93.184.216.34"],
    };
  }),
  validateFinalUrl: vi.fn(async (input: string) => ({
    raw: input,
    normalized: input,
    host: new URL(input).hostname,
    origin: new URL(input).origin,
    ips: ["93.184.216.34"],
  })),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("scan source planning", () => {
  it("canonicalizes tracking params, fragments, and trailing slash variants", () => {
    expect(canonicalizeUrl("https://example.org/path/?utm_source=x&b=1#top")).toBe(
      "https://example.org/path?b=1"
    );
  });

  it("keeps manual URLs on the same origin and dedupes them", async () => {
    const plan = await resolveScanSourcePlan({
      baseUrl: "https://example.org/",
      scanType: "manual",
      maxPages: 3,
      sourceUrls: [
        "https://example.org/a#top",
        "https://example.org/a/",
        "https://other.example.org/a",
        "https://example.org/b?utm_campaign=x",
      ],
    });

    expect(plan.discoverySource).toBe("manual");
    expect(plan.targets).toEqual(["https://example.org/a", "https://example.org/b"]);
  });

  it("extracts sitemap URL entries and caps the target list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        url: "https://example.org/sitemap.xml",
        text: async () => `
          <urlset>
            <url><loc>https://example.org/a</loc></url>
            <url><loc>https://example.org/b?utm_source=x</loc></url>
            <url><loc>https://example.org/c</loc></url>
          </urlset>
        `,
      }))
    );

    const plan = await resolveScanSourcePlan({
      baseUrl: "https://example.org/",
      scanType: "sitemap",
      maxPages: 2,
    });

    expect(plan.discoverySource).toBe("sitemap");
    expect(plan.targets).toEqual(["https://example.org/a", "https://example.org/b"]);
  });

  it("normalizes same-origin links and rejects cross-origin links", () => {
    expect(
      sameOriginCanonicalUrl("/pricing/?utm_source=x#plans", "https://example.org/", "https://example.org")
    ).toBe("https://example.org/pricing");
    expect(
      sameOriginCanonicalUrl("https://evil.example/pricing", "https://example.org/", "https://example.org")
    ).toBeNull();
  });
});
