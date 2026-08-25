/**
 * Browser lifecycle + memory hardening (Phase 4).
 *
 * The worker launches ONE Chromium per process and hands out an isolated
 * `browser.newContext()` per page job (callers open the context; this manager
 * only owns the long-lived Browser). This kills the OOM class that came from a
 * full Chromium launch per job.
 *
 * Three concerns live here:
 *
 *   1. Single shared browser. `acquire()` lazily launches Chromium on first use
 *      and returns a lease pinned to the current browser "generation". The lease
 *      MUST be `release()`d in a finally so the manager can account for memory
 *      and recycle decisions. Concurrent acquires share one launch.
 *
 *   2. Crash recovery. We listen for the Browser `disconnected` event. A crash
 *      (Chromium killed / OOM-reaped) nulls the browser and triggers a relaunch
 *      with exponential backoff (max `relaunchAttempts`, default 3). The
 *      in-flight page job(s) on the dead browser throw and requeue through the
 *      normal `failPageJob` path — they are never lost. If every relaunch fails,
 *      the manager goes unhealthy and fires `onUnhealthy` so the worker can fail
 *      its /health and exit nonzero for the platform to restart it.
 *
 *   3. Memory guard. After every job (each `release`) we check RSS and the job
 *      count on the current browser. Above `maxRssBytes` (env WORKER_MAX_RSS_MB)
 *      OR after `recycleAfterJobs` (env WORKER_BROWSER_RECYCLE_JOBS) we
 *      gracefully close and relaunch Chromium *between* jobs, logging
 *      `browser.recycled` with the reason. Under sustained concurrency the
 *      manager stops issuing new leases once a recycle is due so the in-flight
 *      leases can drain to zero first.
 */
import type { Browser } from "playwright";
import { logScanEvent, type WorkerLogLevel } from "./log";

/**
 * Why a browser is being replaced.
 *   rss   — memory ceiling reached
 *   jobs  — job count reached
 *   leak  — a page or context ignored close(); its renderer process is still
 *           around and only a relaunch reclaims it (see scanner/page-ops).
 */
export type RecycleReason = "rss" | "jobs" | "leak";

export interface BrowserLease {
  /** The shared browser. Open `browser.newContext()` on it; never close it. */
  readonly browser: Browser;
  /** The browser generation this lease belongs to (advances on every launch). */
  readonly generation: number;
  /** Idempotent. Always call in a finally. */
  release(): void;
}

export interface BrowserManagerOptions {
  /** Launches a fresh Chromium. Defaults to the real Playwright launcher. */
  launch: () => Promise<Browser>;
  /** RSS ceiling in bytes; exceeding it recycles the browser between jobs. */
  maxRssBytes: number;
  /** Recycle the browser after this many jobs run on it. */
  recycleAfterJobs: number;
  /** Max relaunch attempts after a crash/recycle before going unhealthy. */
  relaunchAttempts: number;
  /** Base backoff between relaunch attempts (doubled each attempt). */
  relaunchBaseMs: number;
  /** Current RSS in bytes. Injectable for tests. */
  rss?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (level: WorkerLogLevel, event: string, fields?: Record<string, unknown>) => void;
}

/** Cold launch failed — caller should degrade to the static scan (unchanged). */
export class BrowserLaunchError extends Error {
  readonly code = "browser_launch_failed";
  constructor(message: string) {
    super(message);
    this.name = "BrowserLaunchError";
  }
}

/** Browser is unusable (relaunch exhausted, or worker shutting down). */
export class BrowserUnavailableError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "BrowserUnavailableError";
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class BrowserManager {
  private readonly launchFn: () => Promise<Browser>;
  private readonly maxRssBytes: number;
  private readonly recycleAfterJobs: number;
  private readonly maxRelaunchAttempts: number;
  private readonly relaunchBaseMs: number;
  private readonly rssFn: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly log: (
    level: WorkerLogLevel,
    event: string,
    fields?: Record<string, unknown>
  ) => void;

  private browser: Browser | null = null;
  private disconnectHandler: (() => void) | null = null;
  /** A launch/relaunch/recycle currently in progress; acquire awaits it. */
  private pending: Promise<void> | null = null;
  private generation = 0;
  private leases = 0;
  private jobsSinceLaunch = 0;
  private recyclePending: RecycleReason | null = null;
  private shuttingDown = false;
  private healthy = true;
  private fatalError: BrowserUnavailableError | null = null;
  private lastLaunchError: string | null = null;
  private releaseWaiters: Array<() => void> = [];

  /** Wired by the worker to fail /health and exit nonzero for a restart. */
  onUnhealthy?: (err: Error) => void;

  constructor(options: BrowserManagerOptions) {
    this.launchFn = options.launch;
    this.maxRssBytes = options.maxRssBytes;
    this.recycleAfterJobs = options.recycleAfterJobs;
    this.maxRelaunchAttempts = Math.max(1, options.relaunchAttempts);
    this.relaunchBaseMs = Math.max(0, options.relaunchBaseMs);
    this.rssFn = options.rss ?? (() => process.memoryUsage().rss);
    this.sleep = options.sleep ?? defaultSleep;
    this.log = options.log ?? logScanEvent;
  }

  /**
   * Ensure a connected browser and take a lease on it. Throws
   * `BrowserLaunchError` (code browser_launch_failed) if Chromium cannot cold
   * start, so callers keep their static-scan degradation. Throws
   * `BrowserUnavailableError` once relaunch is exhausted or on shutdown.
   */
  async acquire(): Promise<BrowserLease> {
    for (;;) {
      if (this.shuttingDown) {
        throw new BrowserUnavailableError("worker_shutting_down", "Worker is shutting down.");
      }
      if (this.fatalError) throw this.fatalError;

      // Wait out any in-progress (re)launch or recycle, then re-evaluate.
      if (this.pending) {
        await this.pending.catch(() => undefined);
        continue;
      }

      // A recycle is due: stop issuing leases so the in-flight ones drain to
      // zero, then perform it. This is what makes the memory guard fire under
      // sustained WORKER_CONCURRENCY load (leases rarely hit zero on their own).
      if (this.recyclePending && this.browser) {
        if (this.leases === 0) {
          const reason = this.recyclePending;
          this.recyclePending = null;
          await this.startRecycle(reason).catch(() => undefined);
        } else {
          await this.waitForRelease();
        }
        continue;
      }

      if (this.browser?.isConnected()) break;

      // Cold launch (nothing else in flight). A failure here is NOT fatal — the
      // environment may simply lack Chromium, so the job degrades to static.
      this.pending = this.coldLaunch().finally(() => {
        this.pending = null;
      });
      await this.pending.catch(() => undefined);
      if (this.fatalError) throw this.fatalError;
      if (this.browser?.isConnected()) break;
      throw new BrowserLaunchError(this.lastLaunchError ?? "Chromium failed to launch.");
    }

    this.leases += 1;
    const generation = this.generation;
    const browser = this.browser!;
    let released = false;
    return {
      browser,
      generation,
      release: () => {
        if (released) return;
        released = true;
        void this.releaseLease(generation);
      },
    };
  }

  /** Health for the worker's /health endpoint. */
  isHealthy(): boolean {
    return this.healthy && !this.fatalError;
  }

  /** Sanitized lifecycle stats for /health. */
  stats(): {
    connected: boolean;
    healthy: boolean;
    generation: number;
    leases: number;
    jobsOnBrowser: number;
    rssMb: number;
  } {
    return {
      connected: !!this.browser?.isConnected(),
      healthy: this.isHealthy(),
      generation: this.generation,
      leases: this.leases,
      jobsOnBrowser: this.jobsSinceLaunch,
      rssMb: this.rssMb(),
    };
  }

  /** Graceful shutdown: stop issuing leases and close Chromium. */
  async close(): Promise<void> {
    this.shuttingDown = true;
    this.wakeReleaseWaiters();
    if (this.pending) {
      await this.pending.catch(() => undefined);
    }
    const old = this.browser;
    if (old && this.disconnectHandler) old.off("disconnected", this.disconnectHandler);
    this.browser = null;
    this.disconnectHandler = null;
    if (old) {
      try {
        await old.close();
      } catch {
        /* already gone */
      }
    }
    this.log("info", "browser.closed", { reason: "shutdown" });
  }

  // --- internals -----------------------------------------------------------

  private rssMb(): number {
    return Math.round(this.rssFn() / (1024 * 1024));
  }

  private async coldLaunch(): Promise<void> {
    try {
      await this.launch("cold");
      this.lastLaunchError = null;
    } catch (err) {
      this.lastLaunchError = errMessage(err);
      this.log("error", "browser.launch-failed", {
        reason: "cold",
        message: this.lastLaunchError,
      });
    }
  }

  private async launch(reason: string): Promise<void> {
    const browser = await this.launchFn();
    this.generation += 1;
    const generation = this.generation;
    const handler = () => this.onDisconnected(generation);
    browser.on("disconnected", handler);
    this.browser = browser;
    this.disconnectHandler = handler;
    this.jobsSinceLaunch = 0;
    this.recyclePending = null;
    this.healthy = true;
    this.fatalError = null;
    this.log("info", "browser.launched", { reason, generation });
  }

  private onDisconnected(generation: number): void {
    if (generation !== this.generation) return; // stale handler from an old browser
    if (this.shuttingDown) return; // we are tearing down on purpose
    this.log("warn", "browser.disconnected", { generation, leases: this.leases });
    this.browser = null;
    this.disconnectHandler = null;
    // In-flight leases on the dead browser will throw inside scanSinglePage and
    // requeue via failPageJob. Relaunch proactively so the retries find Chromium.
    if (!this.pending) {
      this.pending = this.relaunchWithBackoff("crash").finally(() => {
        this.pending = null;
      });
    }
    this.wakeReleaseWaiters();
  }

  private startRecycle(reason: RecycleReason): Promise<void> {
    this.pending = this.doRecycle(reason).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async doRecycle(reason: RecycleReason): Promise<void> {
    const old = this.browser;
    const handler = this.disconnectHandler;
    if (old && handler) old.off("disconnected", handler); // intentional close, not a crash
    this.browser = null;
    this.disconnectHandler = null;
    this.log("info", "browser.recycled", {
      reason,
      jobs: this.jobsSinceLaunch,
      rssMb: this.rssMb(),
    });
    if (old) {
      try {
        await old.close();
      } catch {
        /* ignore */
      }
    }
    await this.relaunchWithBackoff("recycle");
  }

  private async relaunchWithBackoff(reason: string): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRelaunchAttempts; attempt += 1) {
      try {
        await this.launch(reason);
        this.log("info", "browser.relaunched", {
          reason,
          attempt,
          generation: this.generation,
        });
        this.wakeReleaseWaiters();
        return;
      } catch (err) {
        const message = errMessage(err);
        const last = attempt >= this.maxRelaunchAttempts;
        this.log("error", "browser.relaunch-failed", { reason, attempt, last, message });
        if (last) {
          this.fatalError = new BrowserUnavailableError(
            "browser_relaunch_exhausted",
            `Chromium could not be relaunched after ${attempt} attempts: ${message}`
          );
          this.healthy = false;
          this.log("error", "browser.unhealthy", { reason, message });
          try {
            this.onUnhealthy?.(this.fatalError);
          } catch {
            /* never let the health hook mask the original failure */
          }
          this.wakeReleaseWaiters();
          return;
        }
        await this.sleep(this.relaunchBaseMs * 2 ** (attempt - 1));
      }
    }
  }

  private async releaseLease(generation: number): Promise<void> {
    this.leases = Math.max(0, this.leases - 1);
    if (generation === this.generation) this.jobsSinceLaunch += 1;

    if (!this.recyclePending) {
      const reason = this.recycleReason();
      if (reason) {
        this.recyclePending = reason;
        this.log("info", "browser.recycle-scheduled", {
          reason,
          jobs: this.jobsSinceLaunch,
          rssMb: this.rssMb(),
        });
      }
    }

    this.wakeReleaseWaiters();

    // If we can recycle right now (no active leases, nothing else in flight), do
    // it so the next job gets a fresh browser. Otherwise acquire() drains first.
    if (
      this.recyclePending &&
      this.leases === 0 &&
      !this.pending &&
      !this.shuttingDown &&
      this.browser
    ) {
      const reason = this.recyclePending;
      this.recyclePending = null;
      try {
        await this.startRecycle(reason);
      } catch (err) {
        this.log("error", "browser.recycle-failed", { message: errMessage(err) });
      } finally {
        this.wakeReleaseWaiters();
      }
    }
  }

  /**
   * Ask for a recycle after the current job. Used when a scan reports a page
   * or context that never closed: the renderer survives the scan, so the only
   * way to reclaim it is to replace the browser.
   */
  requestRecycle(reason: RecycleReason): void {
    if (this.recyclePending || this.shuttingDown) return;
    this.recyclePending = reason;
    this.log("info", "browser.recycle-scheduled", {
      reason,
      jobs: this.jobsSinceLaunch,
      rssMb: this.rssMb(),
    });
  }

  private recycleReason(): RecycleReason | null {
    if (this.rssFn() > this.maxRssBytes) return "rss";
    if (this.jobsSinceLaunch >= this.recycleAfterJobs) return "jobs";
    return null;
  }

  private waitForRelease(): Promise<void> {
    return new Promise((resolve) => this.releaseWaiters.push(resolve));
  }

  private wakeReleaseWaiters(): void {
    if (this.releaseWaiters.length === 0) return;
    const waiters = this.releaseWaiters;
    this.releaseWaiters = [];
    for (const wake of waiters) wake();
  }
}

function intFromEnv(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, Math.floor(value)) : fallback;
}

let singleton: BrowserManager | null = null;

/**
 * Process-wide singleton. The launcher is dynamically imported so this module
 * (and its consumers' unit tests) never pull in Playwright unless a browser is
 * actually launched in the running worker.
 */
export function getBrowserManager(): BrowserManager {
  if (!singleton) {
    singleton = new BrowserManager({
      launch: async () => {
        const { launchBrowser } = await import("@/lib/scanner/playwright-runner");
        return launchBrowser();
      },
      maxRssBytes: intFromEnv("WORKER_MAX_RSS_MB", 1536, 256) * 1024 * 1024,
      recycleAfterJobs: intFromEnv("WORKER_BROWSER_RECYCLE_JOBS", 50, 1),
      relaunchAttempts: intFromEnv("WORKER_BROWSER_RELAUNCH_ATTEMPTS", 3, 1),
      relaunchBaseMs: intFromEnv("WORKER_BROWSER_RELAUNCH_BASE_MS", 500, 0),
    });
  }
  return singleton;
}

/** Test-only: drop the singleton so a fresh manager is built next call. */
export function __resetBrowserManagerForTests(): void {
  singleton = null;
}
