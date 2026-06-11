import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { execFileSync } from "node:child_process";
import { runScanJob } from "./playwright-runner";

const runBrowserTests = process.env.RUN_BROWSER_TESTS === "1";

describe.skipIf(!runBrowserTests)("playwright axe runner integration", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    process.env.ACCESSOPS_ALLOW_PRIVATE_SCAN_TARGETS_FOR_TESTS = "1";
    server = createServer((req, res) => {
      if (req.url === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "content-type": "text/html" });
          res.end("<html lang='en'><head><title>Slow</title></head><body><main>Slow</main></body></html>");
        }, 1500);
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html>
        <html lang="en">
          <head>
            <title>Fixture</title>
            <style>
              body { background: #fff; color: #111; }
              .low { color: #777; background: #777; font-size: 16px; }
            </style>
          </head>
          <body>
            <main>
              <img src="/logo.png">
              <p class="low">Low contrast text</p>
              <input id="email" type="email">
            </main>
          </body>
        </html>`);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server_not_listening");
    origin = `http://127.0.0.1:${address.port}`;
  }, 30_000);

  afterAll(async () => {
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("finds known axe violations and closes Chromium", async () => {
    const before = chromiumProcessCount();
    const outcome = await runScanJob({
      jobId: "browser-test",
      url: origin,
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 30_000,
    });

    expect(outcome.pagesScanned).toBe(1);
    const ruleIds = new Set(outcome.pages.flatMap((page) => page.issues.map((issue) => issue.ruleId)));
    expect(Array.from(ruleIds)).toEqual(expect.arrayContaining(["image-alt", "color-contrast", "label"]));
    expect(outcome.pages[0].rawMetadata).toMatchObject({
      engine: "playwright-axe",
      fallbackMode: false,
      resultConfidence: "high",
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(chromiumProcessCount()).toBeLessThanOrEqual(before);
  }, 60_000);

  it("records invalid target failures as structured page metadata", async () => {
    const outcome = await runScanJob({
      jobId: "invalid-test",
      url: "http://does-not-exist.invalid",
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 2_000,
    });

    expect(outcome.pagesScanned).toBe(1);
    expect(outcome.pages[0].rawMetadata?.code).toBeTruthy();
    expect(outcome.pages[0].issues).toEqual([]);
  });

  it("returns quickly with deadline metadata when the page exceeds the deadline", async () => {
    const started = Date.now();
    const outcome = await runScanJob({
      jobId: "deadline-test",
      url: `${origin}/slow`,
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 1,
    });

    expect(Date.now() - started).toBeLessThan(5_000);
    expect(outcome.pagesScanned).toBe(1);
    expect(outcome.pages[0].rawMetadata).toMatchObject({
      code: "deadline_exceeded",
      truncatedByDeadline: true,
    });
  }, 15_000);
});

function chromiumProcessCount(): number {
  try {
    return execFileSync("ps", ["-axo", "command"], { encoding: "utf8" })
      .split("\n")
      .filter((line) => /chrom(e|ium)/i.test(line))
      .filter((line) => /playwright|chromium/i.test(line))
      .length;
  } catch {
    return 0;
  }
}
