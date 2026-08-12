import { describe, expect, it } from "vitest";
import {
  buildFindingsFilterHref,
  filterFindings,
  parseFindingFilters,
  summarizeFindingContexts,
  type FindingContext,
} from "./finding-filters";

type Finding = {
  id: string;
  impact: string;
  severity: string;
  contextsJson: FindingContext[];
};

const findings: Finding[] = [
  {
    id: "critical-desktop",
    impact: "critical",
    severity: "critical",
    contextsJson: [{ viewport: "desktop", state: "initial" }],
  },
  {
    id: "serious-responsive-menu",
    impact: "serious",
    severity: "critical",
    contextsJson: [
      { viewport: "desktop", state: "menu-open" },
      { viewport: "mobile", state: "menu-open" },
    ],
  },
  {
    id: "review-mobile",
    impact: "moderate",
    severity: "review",
    contextsJson: [{ viewport: "mobile", state: "dialog-open" }],
  },
];

describe("finding filters", () => {
  it("accepts only known scalar search parameters", () => {
    expect(
      parseFindingFilters({
        sev: "critical",
        vp: "mobile",
        state: "menu-open",
      })
    ).toEqual({
      severity: "critical",
      viewport: "mobile",
      state: "menu-open",
    });

    expect(
      parseFindingFilters({
        sev: ["critical"],
        vp: "television",
        state: "hovered",
      })
    ).toEqual({ severity: "all", viewport: "all", state: null });
  });

  it("combines severity, viewport, and state filters", () => {
    expect(
      filterFindings(findings, {
        severity: "serious",
        viewport: "mobile",
        state: "menu-open",
      }).map((finding) => finding.id)
    ).toEqual(["serious-responsive-menu"]);

    expect(
      filterFindings(findings, {
        severity: "review",
        viewport: "all",
        state: null,
      }).map((finding) => finding.id)
    ).toEqual(["review-mobile"]);
  });

  it("treats multiple as findings observed at more than one viewport", () => {
    expect(
      filterFindings(findings, {
        severity: "all",
        viewport: "multiple",
        state: null,
      }).map((finding) => finding.id)
    ).toEqual(["serious-responsive-menu"]);
  });

  it("preserves other filters while changing or clearing one", () => {
    const current = {
      severity: "critical" as const,
      viewport: "mobile" as const,
      state: "menu-open" as const,
    };

    expect(
      buildFindingsFilterHref("scan 1", current, { severity: "serious" })
    ).toBe(
      "/app/scans/scan%201?sev=serious&vp=mobile&state=menu-open"
    );
    expect(
      buildFindingsFilterHref("scan 1", current, {
        severity: null,
        viewport: null,
        state: null,
      })
    ).toBe("/app/scans/scan%201");
  });

  it("counts each finding once per viewport and state from the unfiltered set", () => {
    expect(summarizeFindingContexts(findings)).toEqual({
      desktop: 2,
      tablet: 0,
      mobile: 2,
      multiple: 1,
      states: {
        initial: 1,
        "menu-open": 1,
        "dialog-open": 1,
        "accordion-open": 0,
        "tab-open": 0,
        "form-focus": 0,
      },
    });
  });
});
