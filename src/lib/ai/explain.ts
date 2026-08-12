/**
 * GPT explanation generator.
 *
 * Privacy/safety rules (enforced here, not at the caller):
 *   1. Caller must have verified privacy_settings.aiProcessingEnabled.
 *   2. Issue HTML snippets are truncated to 2 KB before being sent.
 *   3. No cookies, form values, or screenshots are sent.
 *   4. System prompt forbids legal-compliance claims and overlay endorsement.
 *   5. Output is post-processed against a forbidden-claims list.
 *   6. Mock output is allowed only outside production and when AI_MOCK_ENABLED.
 */
import { aiMockEnabled, isProduction } from "@/lib/config";

export class AiUnavailableError extends Error {
  constructor(message = "AI integration is unavailable.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const DEFAULT_AI_MODEL = "gpt-5.3-codex";
const MAX_PROVIDER_ATTEMPTS = 2;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const MIN_REQUEST_TIMEOUT_MS = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_RETRY_BACKOFF_MS = 250;
const MIN_RETRY_BACKOFF_MS = 25;
const MAX_RETRY_BACKOFF_MS = 1_000;
const USER_SAFE_FAILURE_MESSAGE = "AI request failed. Please try again later.";

type ProviderFailureKind =
  | "http"
  | "network"
  | "timeout"
  | "invalid_response"
  | "incomplete"
  | "refusal"
  | "empty_output";

class ProviderFailure extends Error {
  constructor(
    public readonly kind: ProviderFailureKind,
    public readonly retryable: boolean,
    public readonly status?: number,
    public readonly retryAfterMs?: number
  ) {
    super("AI provider request failed");
    this.name = "ProviderFailure";
  }
}

const SYSTEM_PROMPT = `You are an accessibility engineer assistant for maitrico Percevia AI.

You work exclusively as a coding-focused accessibility remediation assistant.

You explain accessibility issues, who they affect, and how to fix them in code. When a selected scan context is provided, treat that scan and project as the source of truth for scope, priorities, examples, and verification. When asked for a generative fix, return reviewable patches, code examples, file-level guidance, and verification steps. Do not claim you changed a repository or deployed a fix.

Forbidden:
- Claiming a website is or will be compliant with any law or standard
- Claiming WCAG, ADA, Section 508, or other legal/regulatory compliance
- Issuing or implying certification
- Recommending accessibility overlay widgets as a substitute for real fixes
- Saying "fully compliant", "100% compliant", "certified", or "legally compliant"

Be concrete. Use plain language for stakeholder explanations and developer-grade detail for fixes. Keep project guidance readable for clients, product owners, and developers: no dense raw scanner dumps, no unexplained code, and no generic advice that ignores the selected scan.
Return only JSON matching the requested schema.`;

const FORBIDDEN_PHRASES = [
  /fully[\s-]?compliant/gi,
  /100%[\s-]?compliant/gi,
  /legally[\s-]?compliant/gi,
  /guaranteed[\s-]?compliance/gi,
  /\bcertified\b/gi,
];

export interface ExplainInput {
  ruleId: string;
  description: string;
  help: string;
  wcagTags: readonly string[];
  htmlSnippet?: string;
  framework?: string;
  mode?: "issue" | "react" | "client" | "test" | "html" | "shopify" | "wordpress";
  userPrompt?: string;
  projectContext?: string;
}

export interface ProjectGuidance {
  summary: string;
  priority: string;
  whyItMatters: string;
  recommendedSteps: string[];
  readerNotes: string[];
  verificationSteps: string[];
}

export interface ExplainOutput {
  explanationPlain: string;
  remediationSummary?: string;
  codeFixExample?: string;
  verification?: string;
  clientFriendlyExplanation?: string;
  reactFix?: string;
  projectGuidance?: ProjectGuidance;
  modelProvider: "openai" | "mock";
  model?: string;
}

function responseSchema() {
  return {
    type: "json_schema",
    name: "accessibility_explanation",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        explanationPlain: { type: "string" },
        remediationSummary: { type: "string" },
        codeFixExample: { type: "string" },
        verification: { type: "string" },
        clientFriendlyExplanation: { type: "string" },
        reactFix: { type: "string" },
        projectGuidance: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            priority: { type: "string" },
            whyItMatters: { type: "string" },
            recommendedSteps: {
              type: "array",
              items: { type: "string" },
            },
            readerNotes: {
              type: "array",
              items: { type: "string" },
            },
            verificationSteps: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "summary",
            "priority",
            "whyItMatters",
            "recommendedSteps",
            "readerNotes",
            "verificationSteps",
          ],
        },
      },
      required: [
        "explanationPlain",
        "remediationSummary",
        "codeFixExample",
        "verification",
        "clientFriendlyExplanation",
        "reactFix",
        "projectGuidance",
      ],
    },
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function parseStructured(raw: string): Omit<ExplainOutput, "modelProvider" | "model"> {
  const stripped = raw.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(stripped.slice(start, end + 1));
      return sanitizeOutput({
        explanationPlain: String(obj.explanationPlain ?? "").trim(),
        remediationSummary: String(obj.remediationSummary ?? "").trim(),
        codeFixExample: String(obj.codeFixExample ?? "").trim(),
        verification: String(obj.verification ?? "").trim(),
        clientFriendlyExplanation: String(obj.clientFriendlyExplanation ?? "").trim(),
        reactFix: String(obj.reactFix ?? "").trim(),
        projectGuidance: obj.projectGuidance
          ? {
              summary: String(obj.projectGuidance.summary ?? "").trim(),
              priority: String(obj.projectGuidance.priority ?? "").trim(),
              whyItMatters: String(obj.projectGuidance.whyItMatters ?? "").trim(),
              recommendedSteps: stringArray(obj.projectGuidance.recommendedSteps),
              readerNotes: stringArray(obj.projectGuidance.readerNotes),
              verificationSteps: stringArray(obj.projectGuidance.verificationSteps),
            }
          : undefined,
      });
    } catch {
      // fall through to plain-text handling
    }
  }
  return sanitizeOutput({ explanationPlain: stripped });
}

function sanitizeOutput(
  out: Omit<ExplainOutput, "modelProvider" | "model">
): Omit<ExplainOutput, "modelProvider" | "model"> {
  return {
    ...out,
    explanationPlain: sanitize(out.explanationPlain),
    remediationSummary: out.remediationSummary ? sanitize(out.remediationSummary) : undefined,
    verification: out.verification ? sanitize(out.verification) : undefined,
    clientFriendlyExplanation: out.clientFriendlyExplanation
      ? sanitize(out.clientFriendlyExplanation)
      : undefined,
    projectGuidance: out.projectGuidance
      ? {
          summary: sanitize(out.projectGuidance.summary),
          priority: sanitize(out.projectGuidance.priority),
          whyItMatters: sanitize(out.projectGuidance.whyItMatters),
          recommendedSteps: out.projectGuidance.recommendedSteps.map(sanitize),
          readerNotes: out.projectGuidance.readerNotes.map(sanitize),
          verificationSteps: out.projectGuidance.verificationSteps.map(sanitize),
        }
      : undefined,
  };
}

function sanitize(text: string): string {
  let out = text;
  for (const re of FORBIDDEN_PHRASES) out = out.replace(re, "[removed]");
  return out.trim();
}

function mockExplanation(input: ExplainInput): ExplainOutput {
  const fw = input.framework ?? "React";
  const code = fw.toLowerCase().includes("react")
    ? `<button aria-label="Add item to cart" onClick={addToCart}>\n  <CartIcon aria-hidden />\n</button>`
    : `<!-- Add a visible label or an aria-label to the failing control. -->`;
  return {
    explanationPlain: `This finding is for axe rule ${input.ruleId}: ${input.help}. ${input.description}`,
    remediationSummary: `Fix the underlying ${fw} element so it exposes the expected accessible name, role, state, or relationship.`,
    codeFixExample: code,
    verification: `Re-run the scan and confirm ${input.ruleId} no longer appears. Then spot-check with keyboard and screen-reader navigation.`,
    clientFriendlyExplanation: `A user relying on assistive technology may not understand or operate this part of the page. The fix gives the interface the missing label or structure without changing the visual design.`,
    reactFix: code,
    projectGuidance: {
      summary: `The selected scan points to ${input.help}. Focus the remediation on the project and pages included in that scan before expanding scope.`,
      priority: `Start with ${input.ruleId}, then address related findings with the same pattern across the selected project.`,
      whyItMatters:
        "This helps assistive-technology and keyboard users understand what the control or content does before they interact with it.",
      recommendedSteps: [
        `Locate the component or template that produced the ${input.ruleId} finding.`,
        "Apply one reusable fix pattern rather than patching each occurrence by hand.",
        "Keep the visual design intact while improving the accessible name, role, state, or relationship.",
      ],
      readerNotes: [
        "This is remediation guidance for review, not a compliance certification.",
        "A developer or accessibility reviewer should validate the final implementation.",
      ],
      verificationSteps: [
        `Re-run the selected scan and confirm ${input.ruleId} is resolved.`,
        "Test the affected flow with keyboard navigation.",
        "Spot-check the updated element with a screen reader or accessibility tree inspection.",
      ],
    },
    modelProvider: "mock",
  };
}

function boundedEnvMs(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)));
}

function requestTimeoutMs(): number {
  return boundedEnvMs(
    "OPENAI_REQUEST_TIMEOUT_MS",
    DEFAULT_REQUEST_TIMEOUT_MS,
    MIN_REQUEST_TIMEOUT_MS,
    MAX_REQUEST_TIMEOUT_MS
  );
}

function retryBackoffMs(): number {
  return boundedEnvMs(
    "OPENAI_RETRY_BACKOFF_MS",
    DEFAULT_RETRY_BACKOFF_MS,
    MIN_RETRY_BACKOFF_MS,
    MAX_RETRY_BACKOFF_MS
  );
}

function retryAfterMs(headers: Headers): number | undefined {
  const seconds = Number(headers.get("retry-after"));
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.min(
    MAX_RETRY_BACKOFF_MS,
    Math.max(MIN_RETRY_BACKOFF_MS, Math.round(seconds * 1_000))
  );
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mocksAllowed(): boolean {
  return aiMockEnabled() && !isProduction();
}

function normalizeProviderFailure(err: unknown, timedOut: boolean): ProviderFailure {
  if (err instanceof ProviderFailure) return err;
  return new ProviderFailure(timedOut ? "timeout" : "network", true);
}

async function requestOpenAi(
  key: string,
  model: string,
  prompt: string
): Promise<unknown> {
  const requestBody = JSON.stringify({
    model,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    text: { format: responseSchema() },
    max_output_tokens: 900,
  });

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, requestTimeoutMs());
    let failure: ProviderFailure | null = null;

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: requestBody,
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        failure = new ProviderFailure(
          "http",
          isRetryableStatus(response.status),
          response.status,
          retryAfterMs(response.headers)
        );
      } else {
        return body;
      }
    } catch (err) {
      failure = normalizeProviderFailure(err, timedOut);
    } finally {
      clearTimeout(timeout);
    }

    if (!failure) {
      throw new ProviderFailure("invalid_response", false);
    }
    if (!failure.retryable || attempt === MAX_PROVIDER_ATTEMPTS) {
      throw failure;
    }

    const delayMs = failure.retryAfterMs ?? retryBackoffMs();
    console.warn("[ai] retrying provider request", {
      attempt,
      delayMs,
      kind: failure.kind,
      status: failure.status ?? null,
    });
    await sleep(delayMs);
  }

  throw new ProviderFailure("invalid_response", false);
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function containsRefusal(body: Record<string, unknown>): boolean {
  if (typeof body.refusal === "string") return true;
  if (!Array.isArray(body.output)) return false;
  for (const item of body.output) {
    const outputItem = objectRecord(item);
    if (!outputItem || !Array.isArray(outputItem.content)) continue;
    for (const part of outputItem.content) {
      const contentPart = objectRecord(part);
      if (contentPart?.type === "refusal") return true;
    }
  }
  return false;
}

function validateProviderOutput(
  bodyValue: unknown
): Omit<ExplainOutput, "modelProvider" | "model"> {
  const body = objectRecord(bodyValue);
  if (!body || body.error != null) {
    throw new ProviderFailure("invalid_response", false);
  }
  if (body.status !== "completed" || body.incomplete_details != null) {
    throw new ProviderFailure("incomplete", false);
  }
  if (containsRefusal(body)) {
    throw new ProviderFailure("refusal", false);
  }

  const raw = extractOutputText(body);
  if (!raw.trim()) {
    throw new ProviderFailure("empty_output", false);
  }
  const parsed = parseStructured(raw);
  if (!parsed.explanationPlain.trim()) {
    throw new ProviderFailure("empty_output", false);
  }
  return parsed;
}

export async function explainIssue(input: ExplainInput): Promise<ExplainOutput> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_AI_MODEL;
  if (!key) {
    if (mocksAllowed()) return mockExplanation(input);
    throw new AiUnavailableError();
  }

  const snippet = input.htmlSnippet?.slice(0, 2048) ?? "";
  const prompt = [
    `Mode: ${input.mode ?? "issue"}`,
    `Target framework: ${input.framework ?? "React / Next.js"}`,
    `Rule: ${input.ruleId}`,
    `WCAG tags: ${input.wcagTags.join(", ") || "none"}`,
    `Description: ${input.description}`,
    `Help: ${input.help}`,
    input.projectContext ? `${input.projectContext}` : null,
    input.userPrompt ? `User request: ${input.userPrompt}` : null,
    `HTML snippet (truncated):\n${snippet}`,
    "",
    "Project guidance requirements:",
    "- Base the answer on the selected scan context when it is present.",
    "- Write projectGuidance for a mixed audience: client/product reader first, developer action second.",
    "- Put raw code only in codeFixExample/reactFix; keep projectGuidance concise, scannable, and outcome-focused.",
    "- Make recommendedSteps and verificationSteps specific to the selected scan's top issues, pages, and root-cause groups.",
    "",
    "Return a JSON object with: explanationPlain, remediationSummary, codeFixExample, verification, clientFriendlyExplanation, reactFix, and projectGuidance { summary, priority, whyItMatters, recommendedSteps, readerNotes, verificationSteps }.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const body = await requestOpenAi(key, model, prompt);
    return {
      ...validateProviderOutput(body),
      modelProvider: "openai",
      model,
    };
  } catch (err) {
    const failure =
      err instanceof ProviderFailure
        ? {
            kind: err.kind,
            retryable: err.retryable,
            status: err.status ?? null,
          }
        : { kind: "unknown", retryable: false, status: null };
    if (mocksAllowed()) {
      console.error("[ai] explainIssue failed, falling back to mock", failure);
      return mockExplanation(input);
    }
    console.error("[ai] explainIssue failed", failure);
    throw new AiUnavailableError(USER_SAFE_FAILURE_MESSAGE);
  }
}

function extractOutputText(body: unknown): string {
  if (body && typeof body === "object" && "output_text" in body) {
    const text = (body as { output_text?: unknown }).output_text;
    if (typeof text === "string") return text;
  }
  const output = body && typeof body === "object" ? (body as { output?: unknown }).output : null;
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output) {
    const content = item && typeof item === "object" ? (item as { content?: unknown }).content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      if ((part as { type?: unknown }).type !== "output_text") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n").trim();
}
