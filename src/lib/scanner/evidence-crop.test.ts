import { describe, expect, it } from "vitest";
import { buildEvidenceClip, calculateEvidenceCrop } from "./evidence-crop";

describe("visual evidence crop", () => {
  it("keeps exact element screenshots unchanged", () => {
    expect(
      calculateEvidenceCrop(
        { width: 120, height: 48 },
        { x: 300, y: 200, width: 120, height: 48 },
        { width: 1440, height: 900 }
      )
    ).toEqual({ x: 0, y: 0, width: 120, height: 48 });
  });

  it("removes context padding around the affected element", () => {
    const box = { x: 300, y: 200, width: 120, height: 48 };
    const clip = buildEvidenceClip(box, { width: 1440, height: 900 });

    expect(clip).toEqual({ x: 268, y: 168, width: 184, height: 112 });
    expect(calculateEvidenceCrop({ width: 184, height: 112 }, box, { width: 1440, height: 900 }))
      .toEqual({ x: 32, y: 32, width: 120, height: 48 });
  });

  it("handles screenshots clipped against the viewport edge", () => {
    const box = { x: 4, y: 8, width: 80, height: 40 };

    expect(calculateEvidenceCrop({ width: 116, height: 80 }, box, { width: 390, height: 844 }))
      .toEqual({ x: 4, y: 8, width: 80, height: 40 });
  });
});
