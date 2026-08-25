import { afterEach, describe, expect, it } from "vitest";
import {
  createContextPool,
  maxConcurrentContexts,
  resetScanContextPool,
  scanContextPool,
  scanPageConcurrency,
} from "./context-pool";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

afterEach(() => {
  delete process.env.SCAN_MAX_CONCURRENT_CONTEXTS;
  delete process.env.SCAN_PAGE_CONCURRENCY;
  resetScanContextPool();
});

describe("context pool", () => {
  it("hands out up to `size` slots immediately", async () => {
    const pool = createContextPool(2);
    await pool.acquire();
    await pool.acquire();
    expect(pool.inFlight).toBe(2);
    expect(pool.queued).toBe(0);
  });

  it("queues the next caller until a slot is released", async () => {
    const pool = createContextPool(1);
    const first = await pool.acquire();
    let granted = false;
    const second = pool.acquire().then((slot) => {
      granted = true;
      return slot;
    });

    await Promise.resolve();
    expect(granted).toBe(false);
    expect(pool.queued).toBe(1);

    first.release();
    await second;
    expect(granted).toBe(true);
    expect(pool.inFlight).toBe(1);
  });

  it("never exceeds the ceiling under contention", async () => {
    const pool = createContextPool(2);
    let peak = 0;
    let active = 0;
    const gate = deferred();

    const work = Array.from({ length: 6 }, () =>
      pool.withSlot(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await gate.promise;
        active -= 1;
      })
    );

    await Promise.resolve();
    gate.resolve();
    await Promise.all(work);

    expect(peak).toBe(2);
    expect(pool.inFlight).toBe(0);
  });

  it("serves waiters first-in-first-out", async () => {
    const pool = createContextPool(1);
    const held = await pool.acquire();
    const order: number[] = [];
    const waiters = [1, 2, 3].map((n) =>
      pool.acquire().then((slot) => {
        order.push(n);
        slot.release();
      })
    );

    held.release();
    await Promise.all(waiters);
    expect(order).toEqual([1, 2, 3]);
  });

  it("ignores a double release", async () => {
    const pool = createContextPool(1);
    const slot = await pool.acquire();
    slot.release();
    slot.release();
    expect(pool.inFlight).toBe(0);
  });

  it("releases the slot when the work throws", async () => {
    const pool = createContextPool(1);
    await expect(
      pool.withSlot(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(pool.inFlight).toBe(0);
  });
});

describe("configuration", () => {
  it("defaults to the documented 2-context baseline", () => {
    expect(maxConcurrentContexts()).toBe(2);
    expect(scanPageConcurrency()).toBe(2);
  });

  it("reads the env and clamps absurd values", () => {
    process.env.SCAN_MAX_CONCURRENT_CONTEXTS = "6";
    expect(maxConcurrentContexts()).toBe(6);
    process.env.SCAN_MAX_CONCURRENT_CONTEXTS = "999";
    expect(maxConcurrentContexts()).toBe(16);
    process.env.SCAN_MAX_CONCURRENT_CONTEXTS = "0";
    expect(maxConcurrentContexts()).toBe(1);
    process.env.SCAN_MAX_CONCURRENT_CONTEXTS = "not-a-number";
    expect(maxConcurrentContexts()).toBe(2);
  });

  it("caches the singleton so every caller shares one ceiling", () => {
    process.env.SCAN_MAX_CONCURRENT_CONTEXTS = "3";
    const pool = scanContextPool();
    expect(pool.size).toBe(3);
    process.env.SCAN_MAX_CONCURRENT_CONTEXTS = "8";
    expect(scanContextPool()).toBe(pool);
    expect(scanContextPool().size).toBe(3);
  });
});
