import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateAssistantBrief,
  rankIssuesForBrief,
  type AssistantBriefInput,
} from "./assistant";
import { isAssistantPreset } from "./presets";
import { AiUnavailableError } from "./explain";

function rawIssue(overrides: Record<string, unknown> = {}) {
  return {
    ruleId: "button-name",
    severity: "critical",
    impact: "critical",
    description: "Buttons must have discernible text",
    help: "Buttons must have an accessible name",
    wcagTags: ["wcag2a", "wcag412"],
    pageUrl: "https://example.org/products/x?utm_source=news#top",
    htmlSnippet: "<button></button>",
    ...overrides,
  };
}

function briefInput(overrides: Partial<AssistantBriefInput> = {}): AssistantBriefInput {
  return {
    preset: "plan",
    framework: "React / Next.js",
    siteLabel: "example.org",
    pagesScanned: 4,
    counts: { critical: 1, moderate: 0, minor: 0, passed: 0, review: 0 },
    issues: rankIssuesForBrief([rawIssue()]),
    ...overrides,
  };
}

describe("rankIssuesForBrief", () => {
  it("collapses repeated rules and counts occurrences", () => {
    const ranked = rankIssuesForBrief([
      rawIssue(),
      rawIssue({ pageUrl: "https://example.org/b" }),
      rawIssue({ ruleId: "image-alt", severity: "minor" }),
    ]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].ruleId).toBe("button-name");
    expect(ranked[0].occurrences).toBe(2);
    expect(ranked[1].occurrences).toBe(1);
  });

  it("orders by severity first, then frequency", () => {
    const ranked = rankIssuesForBrief([
      rawIssue({ ruleId: "minor-a", severity: "minor" }),
      rawIssue({ ruleId: "minor-a", severity: "minor" }),
      rawIssue({ ruleId: "minor-a", severity: "minor" }),
      rawIssue({ ruleId: "crit-a", severity: "critical" }),
      rawIssue({ ruleId: "mod-a", severity: "moderate" }),
      rawIssue({ ruleId: "mod-a", severity: "moderate" }),
    ]);
    expect(ranked.map((r) => r.ruleId)).toEqual(["crit-a", "mod-a", "minor-a"]);
  });

  it("reduces page URLs to a path, dropping origin and query string", () => {
    const [ranked] = rankIssuesForBrief([rawIssue()]);
    expect(ranked.pagePath).toBe("/products/x");
  });

  it("keeps the worst-severity example as the representative", () => {
    const [ranked] = rankIssuesForBrief([
      rawIssue({ severity: "minor", help: "minor example" }),
      rawIssue({ severity: "critical", help: "critical example" }),
    ]);
    expect(ranked.help).toBe("critical example");
    expect(ranked.severity).toBe("critical");
  });

  it("only attaches markup snippets to the top findings", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      rawIssue({ ruleId: `rule-${i}`, severity: "minor" })
    );
    const ranked = rankIssuesForBrief(many);
    expect(ranked[0].htmlSnippet).toBeTruthy();
    expect(ranked[ranked.length - 1].htmlSnippet).toBeNull();
  });
});

describe("isAssistantPreset", () => {
  it("accepts known presets and rejects others", () => {
    expect(isAssistantPreset("plan")).toBe(true);
    expect(isAssistantPreset("research")).toBe(true);
    expect(isAssistantPreset("definitely-not")).toBe(false);
  });
});

describe("generateAssistantBrief", () => {
  let originalKey: string | undefined;
  let originalMock: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ANTHROPIC_API_KEY;
    originalMock = process.env.AI_MOCK_ENABLED;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (originalMock === undefined) delete process.env.AI_MOCK_ENABLED;
    else process.env.AI_MOCK_ENABLED = originalMock;
  });

  it("returns a markdown mock brief when no key is set and AI_MOCK_ENABLED=true", async () => {
    process.env.AI_MOCK_ENABLED = "true";
    const out = await generateAssistantBrief(briefInput());
    expect(out.modelProvider).toBe("mock");
    expect(out.markdown).toMatch(/^## Summary/);
    expect(out.markdown).toMatch(/button-name/);
    expect(out.markdown).toMatch(/AI-generated suggestion/);
  });

  it("throws AiUnavailableError when no key is set and mock is disabled", async () => {
    process.env.AI_MOCK_ENABLED = "false";
    await expect(generateAssistantBrief(briefInput())).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it("never claims compliance or certification", async () => {
    process.env.AI_MOCK_ENABLED = "true";
    const out = await generateAssistantBrief(briefInput());
    expect(out.markdown).not.toMatch(/fully compliant/i);
    expect(out.markdown).not.toMatch(/100% compliant/i);
    expect(out.markdown).not.toMatch(/legally compliant/i);
    expect(out.markdown).not.toMatch(/certified/i);
  });

  it("handles a scan with no findings", async () => {
    process.env.AI_MOCK_ENABLED = "true";
    const out = await generateAssistantBrief(
      briefInput({
        issues: [],
        counts: { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 },
      })
    );
    expect(out.markdown).toMatch(/No findings were recorded/);
  });
});
