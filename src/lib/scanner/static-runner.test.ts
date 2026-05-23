import { describe, expect, it } from "vitest";
import { analyzeHtml } from "./static-runner";

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
});
