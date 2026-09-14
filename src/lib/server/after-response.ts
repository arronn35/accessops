import { after } from "next/server";

/**
 * Schedule non-critical work after the response. Direct route-handler unit
 * tests have no Next request store, so they fall back to an unawaited promise.
 */
export function afterResponse(callback: () => void | Promise<void>): void {
  try {
    after(callback);
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      void callback();
      return;
    }
    throw error;
  }
}
