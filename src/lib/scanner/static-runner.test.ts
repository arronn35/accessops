import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeHtml, runStaticScanJob } from "./static-runner";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeHtml", () => {
  it("reports core static accessibility failures", () => {
    const out = analyzeHtml(`
      <!doctype html>
      <html>
        <head><title></title></head>
        <body>
          <img src="/logo.png">
          <button><span></span></button>
          <a href="/next"><svg aria-hidden="true"></svg></a>
          <input id="email" type="email">
          <h1>Home</h1><h3>Skipped</h3>
        </body>
      </html>
    `);

    expect(out.issues.map((i) => i.ruleId)).toEqual(
      expect.arrayContaining([
        "document-title",
        "html-has-lang",
        "image-alt",
        "button-name",
        "link-name",
        "label",
        "heading-order",
        "landmark-one-main",
        "meta-viewport",
      ])
    );
  });

  it("does not report labels and names when accessible text exists", () => {
    const out = analyzeHtml(`
      <!doctype html>
      <html lang="en">
        <head>
          <title>Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <main>
            <img src="/logo.png" alt="AccessOps">
            <button>Save</button>
            <a href="/reports">Reports</a>
            <label for="email">Email</label>
            <input id="email" type="email">
          </main>
        </body>
      </html>
    `);

    expect(out.issues.map((i) => i.ruleId)).not.toEqual(
      expect.arrayContaining(["document-title", "html-has-lang", "image-alt", "button-name", "link-name", "label"])
    );
  });

  it("extracts crawlable links", () => {
    const out = analyzeHtml(`
      <html lang="en"><head><title>Links</title></head>
      <body><main>
        <a href="/pricing">Pricing</a>
        <a href="mailto:test@example.com">Mail</a>
      </main></body></html>
    `, "https://accessops.example/app");

    expect(out.links).toContain("https://accessops.example/pricing");
    expect(out.links.some((link) => link.startsWith("mailto:"))).toBe(false);
  });

  it("marks static fallback findings with degraded context metadata", () => {
    const out = analyzeHtml("<html><head></head><body><img src='/x.png'></body></html>");
    expect(out.issues.length).toBeGreaterThan(0);
    expect(out.issues[0].contexts).toEqual([{ viewport: "desktop", state: "initial" }]);
  });

  it("marks static scan pages as low-confidence fallback results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        url: "http://93.184.216.34/",
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "<html><head><title>Example</title></head><body><main>Ok</main></body></html>",
      }))
    );

    const out = await runStaticScanJob({
      jobId: "test",
      url: "http://93.184.216.34/",
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 1000,
    });

    expect(out.pages[0].rawMetadata).toMatchObject({
      engine: "static-html-fallback",
      fallbackMode: true,
      resultConfidence: "low",
    });
  });
});
