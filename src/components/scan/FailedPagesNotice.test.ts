import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FailedPagesNotice } from "./FailedPagesNotice";
import type { PageJob } from "@/lib/data/types";

describe("FailedPagesNotice", () => {
  it("shows the failed page URL and partial-result count", () => {
    const job: PageJob = {
      id: "page-3",
      scanJobId: "scan-1",
      workspaceId: "ws-1",
      url: "https://example.com/hangs",
      status: "failed",
      attempts: 2,
      maxAttempts: 2,
      deadlineMs: 60_000,
      error: "Page scan exceeded its deadline.",
      errorCode: "page_deadline_exceeded",
      createdAt: new Date(),
      finishedAt: new Date(),
    };

    const html = renderToStaticMarkup(
      createElement(FailedPagesNotice, { jobs: [job], pagesScanned: 4 })
    );

    expect(html).toContain("1 page could not be scanned");
    expect(html).toContain("4 pages that completed successfully");
    expect(html).toContain("https://example.com/hangs");
  });
});
