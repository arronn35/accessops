import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { explainIssue, AiUnavailableError, DEFAULT_AI_MODEL } from "./explain";

describe("explainIssue", () => {
  let originalKey: string | undefined;
  let originalMock: string | undefined;
  beforeEach(() => {
    originalKey = process.env.OPENAI_API_KEY;
    originalMock = process.env.AI_MOCK_ENABLED;
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
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
    expect(out.codeFixExample).toBeTruthy();
    expect(out.verification).toMatch(/button-name/);
    expect(out.projectGuidance?.recommendedSteps.length).toBeGreaterThan(0);
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

  it("asks the model for structured project guidance using the selected scan context", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            explanationPlain: "The selected scan shows unlabeled controls.",
            remediationSummary: "Add accessible names to the shared icon button component.",
            codeFixExample: "<button aria-label=\"Open menu\">...</button>",
            verification: "Re-run scan-1 and test keyboard navigation.",
            clientFriendlyExplanation: "Some controls need clearer labels for assistive technology users.",
            reactFix: "<IconButton aria-label=\"Open menu\" />",
            projectGuidance: {
              summary: "Focus this project on the unlabeled controls found in scan-1.",
              priority: "Fix the shared button pattern first.",
              whyItMatters: "Users need a clear control name before activating it.",
              recommendedSteps: ["Update the shared component", "Apply labels from visible intent"],
              readerNotes: ["This is guidance for review."],
              verificationSteps: ["Re-run the selected scan", "Spot-check with a screen reader"],
            },
          }),
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const out = await explainIssue({
      ruleId: "button-name",
      description: "Buttons must have names",
      help: "Button missing accessible name",
      wcagTags: ["wcag412"],
      framework: "React / Next.js",
      userPrompt: "What should we fix first?",
      projectContext:
        "Selected project context:\nProject folder: Storefront (storefront)\nScan ID: scan-1\nRoot-cause groups:\n- Buttons missing names",
    });

    expect(out.projectGuidance?.summary).toMatch(/scan-1/);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body));
    const userContent = body.input[1].content as string;
    expect(userContent).toMatch(/Project folder: Storefront/);
    expect(userContent).toMatch(/Base the answer on the selected scan context/);
    expect(userContent).toMatch(/projectGuidance/);
  });
});

describe("DEFAULT_AI_MODEL", () => {
  it("uses the coding-specialized Codex model by default", () => {
    expect(DEFAULT_AI_MODEL).toBe("gpt-5.3-codex");
  });
});
