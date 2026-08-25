import { describe, expect, it, vi } from "vitest";
import {
  OpTimeoutError,
  isOpTimeout,
  safeDispose,
  withOp,
  withOpOr,
} from "./page-ops";

const never = () => new Promise<never>(() => {});

describe("withOp", () => {
  it("returns the value when the call finishes in time", async () => {
    await expect(withOp("fast", 1_000, async () => "ok")).resolves.toBe("ok");
  });

  it("rejects with OpTimeoutError when the call never settles", async () => {
    await expect(withOp("stuck", 20, never)).rejects.toBeInstanceOf(OpTimeoutError);
  });

  it("swallows the abandoned call so it cannot crash the worker later", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    await expect(
      withOp("late-failure", 10, () =>
        new Promise((_, reject) => setTimeout(() => reject(new Error("too late")), 40))
      )
    ).rejects.toBeInstanceOf(OpTimeoutError);
    await new Promise((r) => setTimeout(r, 80));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("propagates the original error untouched", async () => {
    await expect(
      withOp("throws", 1_000, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });
});

describe("withOpOr", () => {
  it("falls back instead of throwing on timeout", async () => {
    await expect(withOpOr("stuck", 20, never, "fallback")).resolves.toBe("fallback");
  });

  it("falls back on a rejected call", async () => {
    await expect(
      withOpOr("throws", 1_000, async () => {
        throw new Error("boom");
      }, null)
    ).resolves.toBeNull();
  });
});

describe("isOpTimeout", () => {
  it("recognises its own error and the serialized message", () => {
    expect(isOpTimeout(new OpTimeoutError("x", 1))).toBe(true);
    expect(isOpTimeout(new Error("op_timeout:page.close after 3000ms"))).toBe(true);
    expect(isOpTimeout(new Error("navigation failed"))).toBe(false);
  });
});

describe("safeDispose", () => {
  it("closes a healthy page and context", async () => {
    const page = { isClosed: () => false, close: vi.fn(async () => undefined) };
    const context = { close: vi.fn(async () => undefined) };
    const result = await safeDispose(
      { page: page as never, context: context as never },
      500
    );
    expect(page.close).toHaveBeenCalledWith({ runBeforeUnload: false });
    expect(context.close).toHaveBeenCalled();
    expect(result).toEqual({ clean: true, leaked: false });
  });

  it("reports a leak when the renderer ignores close()", async () => {
    const page = { isClosed: () => false, close: never };
    const context = { close: vi.fn(async () => undefined) };
    const result = await safeDispose(
      { page: page as never, context: context as never },
      20
    );
    // Still closes the context even though the page is wedged.
    expect(context.close).toHaveBeenCalled();
    expect(result.leaked).toBe(true);
  });

  it("skips an already-closed page", async () => {
    const page = { isClosed: () => true, close: vi.fn() };
    const result = await safeDispose({ page: page as never, context: null }, 100);
    expect(page.close).not.toHaveBeenCalled();
    expect(result.clean).toBe(true);
  });
});
