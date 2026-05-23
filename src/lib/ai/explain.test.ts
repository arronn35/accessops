import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { explainIssue, AiUnavailableError } from "./explain";

describe("explainIssue", () => {
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

  it("returns a mock explanation when no key is set and AI_MOCK_ENABLED=true", async () => {
    process.env.AI_MOCK_ENABLED = "true";
    const out = await explainIssue({
      ruleId: "button-name",
      description: "Buttons must have discernible text",
      help: "Buttons must have an accessible name",
      wcagTags: ["wcag2a", "wcag412"],
      framework: "react",
    });
    expect(out.modelProvider).toBe("mock");
    expect(out.explanationPlain).toMatch(/button-name/);
    expect(out.explanationPlain).toMatch(/AI-generated suggestion/);
  });

  it("throws AiUnavailableError when no key is set and mock is disabled", async () => {
    process.env.AI_MOCK_ENABLED = "false";
    await expect(
      explainIssue({
        ruleId: "button-name",
        description: "x",
        help: "y",
        wcagTags: [],
      })
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("does not include forbidden compliance claims in the mock output", async () => {
    process.env.AI_MOCK_ENABLED = "true";
    const out = await explainIssue({
      ruleId: "any",
      description: "x",
      help: "y",
      wcagTags: [],
    });
    expect(out.explanationPlain).not.toMatch(/fully compliant/i);
    expect(out.explanationPlain).not.toMatch(/100% compliant/i);
    expect(out.explanationPlain).not.toMatch(/legally compliant/i);
    expect(out.explanationPlain).not.toMatch(/certified/i);
  });
});
