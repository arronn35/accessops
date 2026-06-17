import { describe, expect, it } from "vitest";
import type { Browser } from "playwright";
import {
  BrowserLaunchError,
  BrowserManager,
  BrowserUnavailableError,
  type BrowserManagerOptions,
} from "./browser-manager";

/**
 * Minimal stand-in for a Playwright Browser. The manager only ever touches
 * `on`/`off`/`isConnected`/`close`, so we model just those plus a `crash()`
 * helper that fires `disconnected` with the listeners still attached (an
 * unexpected death), unlike `close()` which the manager detaches before.
 */
class FakeBrowser {
  connected = true;
  closed = false;
  private handlers = new Set<() => void>();

  on(event: string, handler: () => void): this {
    if (event === "disconnected") this.handlers.add(handler);
    return this;
  }
  off(event: string, handler: () => void): this {
    if (event === "disconnected") this.handlers.delete(handler);
    return this;
  }
  isConnected(): boolean {
    return this.connected;
  }
  async close(): Promise<void> {
    this.closed = true;
    this.connected = false;
    // A real browser fires `disconnected` on close too; for an intentional
    // close the manager has already detached, so this should be a no-op.
    for (const handler of [...this.handlers]) handler();
  }
  /** Simulate an unexpected death (Chromium killed / OOM-reaped). */
  crash(): void {
    this.connected = false;
    for (const handler of [...this.handlers]) handler();
  }
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

interface Harness {
  manager: BrowserManager;
  browsers: FakeBrowser[];
  logs: Array<{ level: string; event: string; fields: Record<string, unknown> }>;
  sleeps: number[];
  setLaunch(fn: () => FakeBrowser): void;
}

function makeManager(opts: Partial<BrowserManagerOptions> & { rss?: () => number } = {}): Harness {
  const browsers: FakeBrowser[] = [];
  const logs: Harness["logs"] = [];
  const sleeps: number[] = [];
  let launchBehavior = (): FakeBrowser => {
    const browser = new FakeBrowser();
    browsers.push(browser);
    return browser;
  };

  const manager = new BrowserManager({
    launch: async () => launchBehavior() as unknown as Browser,
    maxRssBytes: opts.maxRssBytes ?? 4096 * 1024 * 1024,
    recycleAfterJobs: opts.recycleAfterJobs ?? 50,
    relaunchAttempts: opts.relaunchAttempts ?? 3,
    relaunchBaseMs: opts.relaunchBaseMs ?? 0,
    rss: opts.rss ?? (() => 100 * 1024 * 1024),
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
    log: (level, event, fields = {}) => logs.push({ level, event, fields }),
  });

  return {
    manager,
    browsers,
    logs,
    sleeps,
    setLaunch: (fn) => {
      launchBehavior = fn;
    },
  };
}

describe("BrowserManager", () => {
  it("launches one Chromium and shares it across concurrent acquires", async () => {
    const { manager, browsers } = makeManager();

    const [a, b] = await Promise.all([manager.acquire(), manager.acquire()]);

    expect(browsers).toHaveLength(1);
    expect(a.browser).toBe(b.browser);
    expect(manager.stats()).toMatchObject({ connected: true, leases: 2, generation: 1 });

    a.release();
    b.release();
  });

  it("recycles the browser after the configured job count", async () => {
    const { manager, browsers, logs } = makeManager({ recycleAfterJobs: 2 });

    (await manager.acquire()).release();
    (await manager.acquire()).release(); // 2nd job hits the recycle threshold

    // The next acquire awaits the in-progress recycle and lands on a fresh browser.
    const lease = await manager.acquire();
    expect(browsers).toHaveLength(2);
    expect(browsers[0].closed).toBe(true);
    expect(lease.browser).toBe(browsers[1] as unknown as Browser);
    expect(
      logs.some((l) => l.event === "browser.recycled" && l.fields.reason === "jobs")
    ).toBe(true);
    expect(manager.stats().jobsOnBrowser).toBe(0); // counter reset on the new browser
    lease.release();
  });

  it("recycles the browser when RSS exceeds the ceiling", async () => {
    let rss = 100 * 1024 * 1024;
    const { manager, browsers, logs } = makeManager({
      maxRssBytes: 200 * 1024 * 1024,
      rss: () => rss,
    });

    const lease = await manager.acquire();
    rss = 300 * 1024 * 1024; // climb over the ceiling during the job
    lease.release();

    const next = await manager.acquire();
    expect(browsers).toHaveLength(2);
    expect(browsers[0].closed).toBe(true);
    expect(
      logs.some((l) => l.event === "browser.recycled" && l.fields.reason === "rss")
    ).toBe(true);
    next.release();
  });

  it("relaunches after a crash and the retry lands on the fresh browser", async () => {
    const { manager, browsers } = makeManager();

    const lease = await manager.acquire();
    (lease.browser as unknown as FakeBrowser).crash(); // killed mid-job
    lease.release(); // the in-flight job fails and releases its lease

    const retry = await manager.acquire(); // the requeued page job
    expect(browsers).toHaveLength(2);
    expect(retry.browser).toBe(browsers[1] as unknown as Browser);
    expect(manager.isHealthy()).toBe(true);
    retry.release();
  });

  it("backs off then goes unhealthy when every relaunch fails", async () => {
    const { manager, sleeps, setLaunch } = makeManager({
      relaunchAttempts: 3,
      relaunchBaseMs: 10,
    });

    const lease = await manager.acquire();
    let unhealthy: Error | null = null;
    manager.onUnhealthy = (err) => {
      unhealthy = err;
    };

    setLaunch(() => {
      throw new Error("no chromium");
    });
    (lease.browser as unknown as FakeBrowser).crash();
    lease.release();

    await expect(manager.acquire()).rejects.toMatchObject({
      code: "browser_relaunch_exhausted",
    });
    expect(unhealthy).toBeInstanceOf(BrowserUnavailableError);
    expect(manager.isHealthy()).toBe(false);
    expect(sleeps).toEqual([10, 20]); // exponential backoff between 3 attempts
  });

  it("drains in-flight leases before recycling under concurrency", async () => {
    const { manager, browsers } = makeManager({ recycleAfterJobs: 1 });

    const a = await manager.acquire();
    const b = await manager.acquire();
    expect(browsers).toHaveLength(1);

    a.release(); // recycle now due, but b still holds a lease → deferred
    const pendingAcquire = manager.acquire(); // must block while draining
    await tick();
    expect(browsers).toHaveLength(1); // no recycle while b is in flight

    b.release(); // leases hit zero → recycle + relaunch
    const c = await pendingAcquire;
    expect(browsers).toHaveLength(2);
    expect(c.browser).toBe(browsers[1] as unknown as Browser);
    expect(browsers[0].closed).toBe(true);
    c.release();
  });

  it("surfaces a cold-launch failure as browser_launch_failed without going unhealthy", async () => {
    const { manager, setLaunch } = makeManager();
    setLaunch(() => {
      throw new Error("chromium missing");
    });

    await expect(manager.acquire()).rejects.toBeInstanceOf(BrowserLaunchError);
    // A cold failure means "no Chromium here" → callers degrade to a static
    // scan; it must NOT mark the worker unhealthy or trigger an exit.
    expect(manager.isHealthy()).toBe(true);
  });

  it("closes the browser on shutdown and refuses further leases", async () => {
    const { manager, browsers } = makeManager();
    (await manager.acquire()).release();

    await manager.close();
    expect(browsers[0].closed).toBe(true);

    await expect(manager.acquire()).rejects.toMatchObject({ code: "worker_shutting_down" });
  });
});
