/**
 * Hang-proof wrappers around raw Playwright calls.
 *
 * Why this module exists
 * ----------------------
 * `page.setDefaultTimeout()` governs Playwright's *waiting* APIs (goto,
 * waitFor*, locator actions). It does NOT govern `page.evaluate()`,
 * `page.content()`, `page.title()`, `page.close()` or `context.close()`.
 * Those talk to the renderer's main thread, so a page that busy-loops
 * (`while(true)`, a runaway rAF, a synchronous XHR, a debugger statement)
 * makes them wait forever. That is the last remaining class of "the scan sits
 * in progress and never finishes": the cooperative deadline is checked
 * *between* calls, so it cannot interrupt one that never returns.
 *
 * Every raw call the scanner makes goes through `withOp`, so the worst case is
 * a bounded op-timeout that degrades one variant instead of wedging the job.
 */
import type { BrowserContext, Page } from "playwright";

export class OpTimeoutError extends Error {
  constructor(
    public readonly op: string,
    public readonly ms: number
  ) {
    super(`op_timeout:${op} after ${ms}ms`);
    this.name = "OpTimeoutError";
  }
}

export function isOpTimeout(err: unknown): err is OpTimeoutError {
  return err instanceof OpTimeoutError || /^op_timeout:/.test((err as Error)?.message ?? "");
}

/**
 * Run `fn` with a hard wall-clock bound.
 *
 * The losing promise is explicitly swallowed: when the timer wins, the
 * original call is still pending inside Playwright and would otherwise surface
 * later as an unhandledRejection and kill the worker process.
 */
export async function withOp<T>(
  op: string,
  ms: number,
  fn: () => Promise<T>
): Promise<T> {
  const bounded = Math.max(1, Math.floor(ms));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = (async () => fn())();
  work.catch(() => undefined);
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new OpTimeoutError(op, bounded)), bounded);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Best-effort variant: never throws, returns `fallback` on timeout or error. */
export async function withOpOr<T>(
  op: string,
  ms: number,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await withOp(op, ms, fn);
  } catch {
    return fallback;
  }
}

export interface DisposeResult {
  /** False when the renderer never acknowledged the close within the budget. */
  clean: boolean;
  /** True when a page/context was left behind and the browser should recycle. */
  leaked: boolean;
}

/**
 * Tear a page + context down without ever blocking the scan.
 *
 * A hung renderer can ignore `close()` indefinitely. When that happens we stop
 * waiting and report `leaked: true`; the caller flags the shared browser for
 * recycling so the abandoned renderer process cannot accumulate.
 */
export async function safeDispose(
  target: { page?: Page | null; context?: BrowserContext | null },
  ms = 3_000
): Promise<DisposeResult> {
  let clean = true;
  if (target.page && !target.page.isClosed()) {
    try {
      await withOp("page.close", ms, () =>
        target.page!.close({ runBeforeUnload: false })
      );
    } catch {
      clean = false;
    }
  }
  if (target.context) {
    try {
      await withOp("context.close", ms, () => target.context!.close());
    } catch {
      clean = false;
    }
  }
  return { clean, leaked: !clean };
}

export type SettleLevel = "networkidle" | "load" | "domcontentloaded";

export interface SettleResult {
  level: SettleLevel;
  waitedMs: number;
}

/**
 * Wait for a page to be *analysis-ready* without paying the full networkidle
 * price on every pass.
 *
 * `networkidle` means "no network connections for 500ms". Sites with
 * analytics beacons, polling, websockets or lazy media never reach it, so a
 * blanket networkidle wait always burns its entire cap. Measured on real
 * pages this single wait was ~85% of a scan pass while axe itself took
 * ~300ms. Here it is capped separately and treated as a bonus, not a
 * requirement: `load` is the contract, idle is best-effort on top.
 */
export async function waitForSettled(
  page: Page,
  opts: { loadMs?: number; idleMs?: number } = {}
): Promise<SettleResult> {
  const startedAt = Date.now();
  const loadMs = Math.max(1, opts.loadMs ?? 5_000);
  const idleMs = Math.max(0, opts.idleMs ?? 2_000);

  let level: SettleLevel = "domcontentloaded";
  try {
    await withOp("waitForLoadState:load", loadMs + 500, () =>
      page.waitForLoadState("load", { timeout: loadMs })
    );
    level = "load";
  } catch {
    // A page that never fires `load` (streaming, stalled subresource) is still
    // analysable — axe works on the DOM that exists.
  }

  if (idleMs > 0) {
    try {
      await withOp("waitForLoadState:networkidle", idleMs + 500, () =>
        page.waitForLoadState("networkidle", { timeout: idleMs })
      );
      level = "networkidle";
    } catch {
      // Expected on most real sites; not an error.
    }
  }

  return { level, waitedMs: Date.now() - startedAt };
}
