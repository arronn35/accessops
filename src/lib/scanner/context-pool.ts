/**
 * Process-wide cap on concurrent browser contexts.
 *
 * Contexts are the unit of memory in this worker: one Chromium, N contexts,
 * each with its own renderer. The deployment baseline is two concurrent
 * contexts on a 2 GB instance, and that ceiling has to hold no matter how the
 * work is shaped — two scans running one page each, or one scan running two
 * pages in parallel, must cost the same.
 *
 * So parallelism is expressed in two separate numbers:
 *   SCAN_MAX_CONCURRENT_CONTEXTS — the hard memory ceiling (this pool).
 *   SCAN_PAGE_CONCURRENCY        — how many pages one scan *tries* to run at
 *                                  once; it still queues on this pool.
 *
 * Raising page concurrency alone can never exceed the memory ceiling: it only
 * lets a single scan use slots that would otherwise sit idle.
 */

export interface PoolSlot {
  /** Idempotent. Always call in a finally. */
  release(): void;
}

export interface ContextPool {
  readonly size: number;
  readonly inFlight: number;
  readonly queued: number;
  acquire(): Promise<PoolSlot>;
  withSlot<T>(fn: () => Promise<T>): Promise<T>;
}

class CountingPool implements ContextPool {
  private active = 0;
  private readonly waiters: Array<(slot: PoolSlot) => void> = [];

  constructor(readonly size: number) {}

  get inFlight(): number {
    return this.active;
  }

  get queued(): number {
    return this.waiters.length;
  }

  acquire(): Promise<PoolSlot> {
    if (this.active < this.size) {
      this.active += 1;
      return Promise.resolve(this.makeSlot());
    }
    // FIFO: a page that has been waiting longest goes next, so a busy pool
    // cannot starve the tail of a crawl.
    return new Promise<PoolSlot>((resolve) => this.waiters.push(resolve));
  }

  async withSlot<T>(fn: () => Promise<T>): Promise<T> {
    const slot = await this.acquire();
    try {
      return await fn();
    } finally {
      slot.release();
    }
  }

  private makeSlot(): PoolSlot {
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        const next = this.waiters.shift();
        if (next) {
          // Hand the slot straight over; `active` stays the same.
          next(this.makeSlot());
          return;
        }
        this.active = Math.max(0, this.active - 1);
      },
    };
  }
}

export function createContextPool(size: number): ContextPool {
  return new CountingPool(Math.max(1, Math.floor(size)));
}

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

/** Hard ceiling on concurrent contexts for this process. */
export function maxConcurrentContexts(): number {
  return intFromEnv("SCAN_MAX_CONCURRENT_CONTEXTS", 2, 1, 16);
}

/** Pages one scan will try to run at the same time. */
export function scanPageConcurrency(): number {
  return intFromEnv("SCAN_PAGE_CONCURRENCY", 2, 1, 8);
}

let singleton: ContextPool | null = null;

/**
 * The process-wide pool. Created on first use so the env is read after the
 * worker has loaded its configuration.
 */
export function scanContextPool(): ContextPool {
  if (!singleton) singleton = createContextPool(maxConcurrentContexts());
  return singleton;
}

/** Test seam: drop the singleton so the next call re-reads the env. */
export function resetScanContextPool(): void {
  singleton = null;
}
