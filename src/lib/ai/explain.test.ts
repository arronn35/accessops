import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { explainIssue, AiRequestError, AiUnavailableError, DEFAULT_AI_MODEL } from "./explain";

const ISSUE_INPUT = {
  ruleId: "button-name",
  description: "Buttons must have discernible text",
  help: "Buttons must have an accessible name",
  wcagTags: ["wcag2a", "wcag412"],
  framework: "react",
} as const;

function providerResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function completedBody(explanationPlain = "Add an accessible name.") {
  return {
    status: "completed",
    error: null,
    incomplete_details: null,
    output_text: JSON.stringify({
      explanationPlain,
      remediationSummary: "Add a durable accessible name in the shared component.",
      codeFixExample: '<button aria-label="Save"></button>',
      verification: "Re-run the scan and test the control with a screen reader.",
      clientFriendlyExplanation: "The control needs a name that assistive technology can announce.",
      reactFix: '<Button aria-label="Save" />',
      projectGuidance: {
        summary: "Fix the shared unlabeled-button pattern.",
        priority: "Address the shared component first.",
        whyItMatters: "Users need to understand the control before activating it.",
        recommendedSteps: ["Update the shared component."],
        readerNotes: ["Review the generated code before applying it."],
        verificationSteps: ["Re-run the scan."],
      },
    }),
  };
}

describe("explainIssue", () => {
  let originalKey: string | undefined;
  let originalMock: string | undefined;
  let originalTimeout: string | undefined;
  let originalBackoff: string | undefined;
  let originalMaxTokens: string | undefined;
  beforeEach(() => {
    originalKey = process.env.OPENAI_API_KEY;
    originalMock = process.env.AI_MOCK_ENABLED;
    originalTimeout = process.env.OPENAI_REQUEST_TIMEOUT_MS;
    originalBackoff = process.env.OPENAI_RETRY_BACKOFF_MS;
    originalMaxTokens = process.env.OPENAI_MAX_OUTPUT_TOKENS;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_REQUEST_TIMEOUT_MS;
    delete process.env.OPENAI_RETRY_BACKOFF_MS;
    delete process.env.OPENAI_MAX_OUTPUT_TOKENS;
    vi.stubEnv("NODE_ENV", "test");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalMock === undefined) delete process.env.AI_MOCK_ENABLED;
    else process.env.AI_MOCK_ENABLED = originalMock;
    vi.unstubAllEnvs();
    if (originalTimeout === undefined) delete process.env.OPENAI_REQUEST_TIMEOUT_MS;
    else process.env.OPENAI_REQUEST_TIMEOUT_MS = originalTimeout;
    if (originalBackoff === undefined) delete process.env.OPENAI_RETRY_BACKOFF_MS;
    else process.env.OPENAI_RETRY_BACKOFF_MS = originalBackoff;
    if (originalMaxTokens === undefined) delete process.env.OPENAI_MAX_OUTPUT_TOKENS;
    else process.env.OPENAI_MAX_OUTPUT_TOKENS = originalMaxTokens;
  });

  it("returns a mock explanation when no key is set and AI_MOCK_ENABLED=true", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.AI_MOCK_ENABLED = "true";
    const out = await explainIssue(ISSUE_INPUT);
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
          status: "completed",
          error: null,
          incomplete_details: null,
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
    expect(body.max_output_tokens).toBe(4096);
    // Mode "issue" (default): codeFixExample is requested, reactFix is not.
    const schema = body.text.format.schema;
    expect(schema.required).toContain("codeFixExample");
    expect(schema.required).not.toContain("reactFix");
    expect(schema.required).not.toContain("clientFriendlyExplanation");
    expect(Object.keys(schema.properties)).toEqual(schema.required);
    const userContent = body.input[1].content as string;
    expect(userContent).toMatch(/Project folder: Storefront/);
    expect(userContent).toMatch(/Base the answer on the selected scan context/);
    expect(userContent).toMatch(/projectGuidance/);
  });

  it("requests only mode-relevant fields in the structured output schema", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => providerResponse(completedBody()));

    await explainIssue({ ...ISSUE_INPUT, mode: "client" });
    let schema = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).text
      .format.schema;
    expect(schema.required).toContain("clientFriendlyExplanation");
    expect(schema.required).not.toContain("codeFixExample");
    expect(schema.required).not.toContain("reactFix");

    await explainIssue({ ...ISSUE_INPUT, mode: "react" });
    schema = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body)).text
      .format.schema;
    expect(schema.required).toContain("reactFix");
    expect(schema.required).toContain("codeFixExample");

    await explainIssue({ ...ISSUE_INPUT, mode: "test" });
    schema = JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body)).text
      .format.schema;
    expect(schema.required).not.toContain("codeFixExample");
    expect(schema.required).toContain("projectGuidance");
  });

  it("clamps the OPENAI_MAX_OUTPUT_TOKENS budget into the supported range", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => providerResponse(completedBody()));

    process.env.OPENAI_MAX_OUTPUT_TOKENS = "99999";
    await explainIssue(ISSUE_INPUT);
    expect(
      JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).max_output_tokens
    ).toBe(16384);

    process.env.OPENAI_MAX_OUTPUT_TOKENS = "10";
    await explainIssue(ISSUE_INPUT);
    expect(
      JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body)).max_output_tokens
    ).toBe(1024);
    delete process.env.OPENAI_MAX_OUTPUT_TOKENS;
  });

  it("aborts timed-out requests and stops after two attempts", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    process.env.OPENAI_REQUEST_TIMEOUT_MS = "1";
    process.env.OPENAI_RETRY_BACKOFF_MS = "25";
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("provider timeout with sensitive details");
              error.name = "AbortError";
              reject(error);
            },
            { once: true }
          );
        })
    );

    const result = expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_timeout",
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(25);
    await vi.advanceTimersByTimeAsync(1_000);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(firstInit.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([429, 503])(
    "retries transient HTTP %i once and returns the successful result",
    async (status) => {
      process.env.OPENAI_API_KEY = "test-key";
      process.env.AI_MOCK_ENABLED = "false";
      process.env.OPENAI_RETRY_BACKOFF_MS = "25";
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          providerResponse(
            { error: { message: "sensitive provider quota detail" } },
            status,
            { "retry-after": "0.001" }
          )
        )
        .mockResolvedValueOnce(providerResponse(completedBody()));

      const out = await explainIssue(ISSUE_INPUT);

      expect(out.modelProvider).toBe("openai");
      expect(out.explanationPlain).toBe("Add an accessible name.");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  );

  it("caps retryable failures at two total attempts", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    process.env.OPENAI_RETRY_BACKOFF_MS = "25";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        providerResponse(
          { error: { message: "sensitive provider outage detail" } },
          503
        )
      );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_provider_error",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces repeated provider 429s as ai_rate_limited with retry guidance", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    process.env.OPENAI_RETRY_BACKOFF_MS = "25";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        providerResponse(
          { error: { message: "quota" } },
          429,
          { "retry-after": "2" }
        )
      );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_rate_limited",
      retryAfterMs: 1000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry authentication or validation failures and hides provider text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        providerResponse(
          { error: { message: "org-secret model validation detail" } },
          400
        )
      );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_provider_error",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "org-secret"
    );
  });

  it("retries a truncated (incomplete) provider response once, then fails with ai_incomplete", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    process.env.OPENAI_RETRY_BACKOFF_MS = "25";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      providerResponse({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output_text: JSON.stringify({ explanationPlain: "Do not use this." }),
      })
    );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_incomplete",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a failed provider response without retrying", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse({
        status: "failed",
        error: null,
        output_text: JSON.stringify({ explanationPlain: "Do not use this." }),
      })
    );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_bad_response",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a completed response that still carries a provider error", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse({
        ...completedBody(),
        error: { message: "sensitive provider body" },
      })
    );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_bad_response",
    });
  });

  it("rejects refusal content instead of treating it as output text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse({
        status: "completed",
        error: null,
        incomplete_details: null,
        output: [
          {
            type: "message",
            content: [
              {
                type: "refusal",
                refusal: "I cannot provide this output.",
              },
            ],
          },
        ],
      })
    );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_refused",
    });
  });

  it("rejects completed responses with no output text", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse({
        status: "completed",
        error: null,
        incomplete_details: null,
        output: [],
      })
    );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_bad_response",
    });
  });

  it("rejects structured output with an empty explanationPlain", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "false";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse(completedBody("   "))
    );

    await expect(explainIssue(ISSUE_INPUT)).rejects.toMatchObject({
      name: "AiRequestError",
      code: "ai_bad_response",
    });
  });

  it("never enables mock output in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.AI_MOCK_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;

    await expect(explainIssue(ISSUE_INPUT)).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it.each([400, 503])(
    "never falls back to mock after provider HTTP %i in production",
    async (status) => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.OPENAI_API_KEY = "test-key";
      process.env.AI_MOCK_ENABLED = "true";
      process.env.OPENAI_RETRY_BACKOFF_MS = "25";
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          providerResponse(
            { error: { message: `production-sensitive-${status}` } },
            status
          )
        );

      await expect(explainIssue(ISSUE_INPUT)).rejects.toBeInstanceOf(
        AiRequestError
      );
      expect(fetchMock).toHaveBeenCalledTimes(status === 503 ? 2 : 1);
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
        `production-sensitive-${status}`
      );
    }
  );

  it("preserves development mock fallback after a provider failure", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.OPENAI_API_KEY = "test-key";
    process.env.AI_MOCK_ENABLED = "true";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse({ error: { message: "development-only failure" } }, 400)
    );

    const out = await explainIssue(ISSUE_INPUT);

    expect(out.modelProvider).toBe("mock");
  });
});

describe("DEFAULT_AI_MODEL", () => {
  it("uses the coding-specialized Codex model by default", () => {
    expect(DEFAULT_AI_MODEL).toBe("gpt-5.3-codex");
  });
});
