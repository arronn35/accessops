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
