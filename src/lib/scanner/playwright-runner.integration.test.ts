import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { execFileSync } from "node:child_process";
import { runScanJob } from "./playwright-runner";
import {
  defaultRunPageScan,
  runWithPageDeadline,
} from "../../../worker/process-page-job";
import type { PageJob, ScanJob } from "@/lib/data/types";

vi.mock("@/lib/data/firestore", () => ({
  completePageJob: vi.fn(),
  failPageJob: vi.fn(),
  renewOwnedScanClaim: vi.fn(),
  touchPageJob: vi.fn(),
  updateScanJob: vi.fn(),
}));
vi.mock("@/lib/scanner/persistence", () => ({
  aggregateScan: vi.fn(),
  persistPageResult: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));
vi.mock("../../../worker/log", () => ({ logScanEvent: vi.fn() }));

const runBrowserTests = process.env.RUN_BROWSER_TESTS === "1";

/** Runs `fn` with a specific page concurrency, restoring the env afterwards. */
async function withPageConcurrency<T>(value: number, fn: () => Promise<T>): Promise<T> {
  const previous = process.env.SCAN_PAGE_CONCURRENCY;
  process.env.SCAN_PAGE_CONCURRENCY = String(value);
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.SCAN_PAGE_CONCURRENCY;
    else process.env.SCAN_PAGE_CONCURRENCY = previous;
  }
}


describe.skipIf(!runBrowserTests)("playwright axe runner integration", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    process.env.PERCEVIA_ALLOW_PRIVATE_SCAN_TARGETS_FOR_TESTS = "1";
    server = createServer((req, res) => {
      if (req.url === "/slow") {
        setTimeout(() => {
          res.writeHead(200, { "content-type": "text/html" });
          res.end("<html lang='en'><head><title>Slow</title></head><body><main>Slow</main></body></html>");
        }, 1500);
        return;
      }
      if (req.url === "/hub") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(`<!doctype html><html lang="en"><head><title>Hub</title></head>
          <body><main><h1>Hub</h1>
            <a href="/slow-child">Slow child</a>
            <a href="/fast-child">Fast child</a>
            <a href="/third-child">Third child</a>
            <a href="/fourth-child">Fourth child</a>
          </main></body></html>`);
        return;
      }
      if (req.url?.endsWith("-child")) {
        const delay = req.url === "/slow-child" ? 900 : 0;
        setTimeout(() => {
          res.writeHead(200, { "content-type": "text/html" });
          res.end(`<!doctype html><html lang="en"><head><title>${req.url}</title></head>
            <body><main><h1>Child</h1><img src="/x.png"><a href="/hub">Back</a></main></body></html>`);
        }, delay);
        return;
      }
      if (req.url === "/states") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(`<!doctype html>
          <html lang="en">
            <head><title>States fixture</title></head>
            <body>
              <main>
                <h1>States</h1>
                <button id="menu" aria-expanded="false" aria-haspopup="menu" aria-controls="nav">Menu</button>
                <ul id="nav" hidden><li><a href="#one">One</a></li></ul>
                <div id="panel" hidden><img src="/only-open.png"></div>
                <script>
                  document.getElementById("menu").addEventListener("click", function (e) {
                    var open = e.currentTarget.getAttribute("aria-expanded") === "true";
                    e.currentTarget.setAttribute("aria-expanded", String(!open));
                    document.getElementById("nav").hidden = open;
                    document.getElementById("panel").hidden = open;
                  });
                </script>
              </main>
            </body>
          </html>`);
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

  it("analyses interactive states, not just the initial load", async () => {
    // Guards the bug where every state pass threw `__name is not defined`
    // inside the page and was silently recorded as "no such control": the scan
    // still passed, but menus, dialogs and accordions were never analysed.
    const outcome = await runScanJob({
      jobId: "states-test",
      url: `${origin}/states`,
      maxPages: 1,
      scanType: "single",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 90_000,
    });

    const page = outcome.pages[0];
    const meta = (page.rawMetadata ?? {}) as Record<string, unknown>;
    const variants = (meta.variants ?? []) as Array<Record<string, unknown>>;
    const states = new Set(variants.map((variant) => String(variant.state)));

    expect(meta.scriptErrors ?? []).toEqual([]);
    expect(states.has("menu-open")).toBe(true);
    expect(variants.length).toBeGreaterThan(3);

    // The image is only in the DOM once the menu is open, so finding it proves
    // the state was actually driven and analysed.
    const contexts = page.issues
      .filter((issue) => issue.ruleId === "image-alt")
      .flatMap((issue) => issue.contexts ?? [])
      .map((context) => context.state);
    expect(contexts).toContain("menu-open");

    // One navigation per viewport is the whole point of the rewrite; the old
    // engine reloaded the page for every single variant.
    expect(Number(meta.navigations)).toBeLessThanOrEqual(
      2 * (meta.viewportsCompleted as number)
    );
  }, 120_000);

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
    expect(outcome.pages[0]).toMatchObject({
      scanFailed: true,
      failureCode: expect.any(String),
    });
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
      scanFailed: true,
      failureCode: "deadline_exceeded",
    });
    expect(outcome.pages[0].scanFailed).toBe(true);
  }, 15_000);

  it("scans pages in parallel without exceeding the page cap", async () => {
    // Four discoverable pages, cap of 3: the crawl must claim exactly three
    // distinct URLs even though several workers pull from the frontier at once.
    const outcome = await runScanJob({
      jobId: "parallel-test",
      url: `${origin}/hub`,
      maxPages: 3,
      scanType: "multi",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 120_000,
    });

    expect(outcome.pagesScanned).toBe(3);
    expect(new Set(outcome.pages.map((page) => page.url)).size).toBe(3);
    expect(outcome.concurrency).toBeGreaterThan(1);
    // Discovery is a DOM read on the page being scanned, so a crawl costs one
    // navigation per page per viewport — never a second context per page.
    for (const page of outcome.pages) {
      expect(page.rawMetadata?.navigations).toBeLessThanOrEqual(6);
    }
  }, 180_000);

  it("keeps results in claim order regardless of which page finishes first", async () => {
    // /hub links to /slow-child (delayed) before /fast-child, so completion
    // order and claim order differ.
    const outcome = await runScanJob({
      jobId: "order-test",
      url: `${origin}/hub`,
      maxPages: 3,
      scanType: "multi",
      includeScreenshots: false,
      storeScreenshots: false,
      timeoutMs: 120_000,
    });

    // /slow-child is linked first but responds ~900ms slower than
    // /fast-child, so completion order and claim order genuinely differ here.
    expect(outcome.pages.map((page) => new URL(page.url).pathname)).toEqual([
      "/hub",
      "/slow-child",
      "/fast-child",
    ]);
  }, 180_000);

  it("runs a parallel crawl faster than the same crawl in series", async () => {
    const serial = await withPageConcurrency(1, () =>
      runScanJob({
        jobId: "serial-timing",
        url: `${origin}/hub`,
        maxPages: 3,
        scanType: "multi",
        includeScreenshots: false,
        storeScreenshots: false,
        timeoutMs: 180_000,
      })
    );
    const parallel = await withPageConcurrency(3, () =>
      runScanJob({
        jobId: "parallel-timing",
        url: `${origin}/hub`,
        maxPages: 3,
        scanType: "multi",
        includeScreenshots: false,
        storeScreenshots: false,
        timeoutMs: 180_000,
      })
    );

    expect(serial.pagesScanned).toBe(parallel.pagesScanned);
    expect(parallel.durationMs).toBeLessThan(serial.durationMs);
  }, 300_000);

  it("aborts a page job whose main document never finishes loading", async () => {
    const hangingServer = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.write("<!doctype html><html lang='en'><head><title>Never finishes</title></head>");
    });
    const sockets = new Set<import("node:net").Socket>();
    hangingServer.on("connection", (socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    await new Promise<void>((resolve, reject) => {
      hangingServer.once("error", reject);
      hangingServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = hangingServer.address();
    if (!address || typeof address === "string") throw new Error("server_not_listening");
    const url = `http://127.0.0.1:${address.port}/hang`;
    const at = new Date();
    const scan: ScanJob = {
      id: "hang-scan",
      workspaceId: "ws-1",
      requestedBy: "user-1",
      scanType: "single",
      status: "running",
      baseUrl: url,
      sourceUrlsJson: null,
      maxPages: 1,
      pagesDiscovered: 1,
      pagesScanned: 0,
      includeScreenshots: false,
      storeScreenshots: false,
      visualEvidenceMaxScreenshots: 0,
      aiExplanationsEnabled: false,
      aiRemediationEnabled: false,
      permissionConfirmed: true,
      progressStep: "scanning",
      startedAt: at,
      completedAt: null,
      errorMessage: null,
      usePageJobs: true,
      phase: "scanning",
      createdAt: at,
      updatedAt: at,
    };
    const job: PageJob = {
      id: "hang-page",
      scanJobId: scan.id,
      workspaceId: scan.workspaceId,
      url,
      status: "running",
      attempts: 1,
      maxAttempts: 2,
      claimedBy: "worker-1",
      deadlineMs: 1_000,
      createdAt: at,
    };

    const started = Date.now();
    try {
      await expect(
        runWithPageDeadline(job, scan, defaultRunPageScan)
      ).rejects.toMatchObject({ code: "page_deadline_exceeded" });
      expect(Date.now() - started).toBeLessThan(5_000);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => hangingServer.close(() => resolve()));
    }
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
