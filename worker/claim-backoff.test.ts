import { describe, expect, it } from "vitest";
import { claimMissBackoffMs } from "./claim-backoff";

describe("claimMissBackoffMs", () => {
  it("backs off exponentially and stays within the configured maximum", () => {
    expect(
      [0, 1, 2, 3, 4, 5, 6].map((misses) =>
        claimMissBackoffMs(misses, 25, 250)
      )
    ).toEqual([0, 25, 50, 100, 200, 250, 250]);
  });
});
