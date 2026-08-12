import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RegionHostingCard } from "./region-hosting-card";

describe("RegionHostingCard", () => {
  it("describes hosting as infrastructure without presenting dead controls", () => {
    const html = renderToStaticMarkup(
      createElement(RegionHostingCard, { workspaceRegion: "us" })
    );

    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain("Default target");
    expect(html).toContain("Enterprise");
    expect(html).toContain("US (Virginia)");
    expect(html).toContain(
      "actual location follows the deployment configuration"
    );
    expect(html).toContain(
      "changing that preference does not move stored data or running workloads"
    );
    expect(html).toContain("mailto:maitritechco@gmail.com");
  });
});
