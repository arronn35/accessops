/**
 * AI explanation generator.
 *
 * Privacy/safety rules (enforced here, not at the caller):
 *   1. Caller must have verified privacy_settings.ai_processing_enabled.
 *   2. Issue HTML snippets are truncated to 2 KB before being sent.
 *   3. No URLs, query strings, or cookies are sent.
 *   4. System prompt forbids legal-compliance claims and overlay endorsement.
 *   5. The output is post-processed: any forbidden phrase removed.
 *   6. If ANTHROPIC_API_KEY is missing, behavior depends on AI_MOCK_ENABLED:
 *      - AI_MOCK_ENABLED=true  → return a mock explanation (local dev/demo).
 *      - otherwise             → throw AiUnavailableError so the API layer
 *                                can return 503 instead of fake output.
 */
import Anthropic from "@anthropic-ai/sdk";
import { aiMockEnabled } from "@/lib/config";

/** Thrown when AI is requested but not configured (and mock is disabled). */
export class AiUnavailableError extends Error {
  constructor(message = "AI integration is not configured.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

const SYSTEM_PROMPT = `You are an accessibility engineer assistant for AccessOps AI.

You explain accessibility issues, who they affect, and how to fix them.

Forbidden:
- Claiming a website is or will be "compliant" with any law or standard
- Claiming WCAG, ADA, EAA, Section 508, or EN 301 549 compliance
- Issuing or implying certification
- Recommending accessibility overlay widgets as a substitute for real fixes
- Saying "fully compliant", "100% compliant", "certified", or "legally compliant"

Always end with: "AI-generated suggestion. Review before implementation."

Be concrete. Show before/after code when relevant. Keep explanations under
180 words. Use plain language a non-technical stakeholder could read,
followed by a developer-targeted fix.`;

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
  wcagTags: string[];
  htmlSnippet?: string;
  framework?: string;
}

export interface ExplainOutput {
  explanationPlain: string;
  remediationSummary?: string;
  codeFixExample?: string;
  modelProvider: "anthropic" | "mock";
}

function sanitize(text: string): string {
  let out = text;
  for (const re of FORBIDDEN_PHRASES) {
    out = out.replace(re, "[removed]");
  }
  return out.trim();
}

function mockExplanation(input: ExplainInput): ExplainOutput {
  const fw = input.framework ?? "HTML";
  return {
    explanationPlain: `This page has a "${input.help}" issue (axe rule \`${input.ruleId}\`). ${input.description} Without this fix, users relying on assistive technology may be unable to perceive, operate, or understand this part of the interface.\n\nAI-generated suggestion. Review before implementation.`,
    remediationSummary: `In ${fw}, address the failing element identified by the rule and verify with a screen reader pass.`,
    codeFixExample: `<!-- Apply the appropriate ARIA attribute, label, or contrast adjustment per axe-core's helpUrl -->`,
    modelProvider: "mock",
  };
}

export async function explainIssue(input: ExplainInput): Promise<ExplainOutput> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    if (aiMockEnabled()) return mockExplanation(input);
    throw new AiUnavailableError();
  }

  const client = new Anthropic({ apiKey: key });
  const snippet = input.htmlSnippet?.slice(0, 2048) ?? "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Explain this accessibility finding.\n\nRule: ${input.ruleId}\nWCAG tags: ${input.wcagTags.join(", ")}\nDescription: ${input.description}\nHelp: ${input.help}\nTarget framework: ${input.framework ?? "HTML/CSS"}\nHTML snippet (truncated):\n${snippet}\n\nRespond with:\n1) Plain-language explanation (max 90 words).\n2) Who is affected (1-2 sentences).\n3) Concrete code fix in the target framework.\n\nEnd with the mandatory "AI-generated suggestion. Review before implementation." line.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const cleaned = sanitize(raw);

    return {
      explanationPlain: cleaned,
      modelProvider: "anthropic",
    };
  } catch (err) {
    // The key is configured but the call failed (network, quota, etc).
    // Only fall back to mock when explicitly allowed; otherwise surface
    // the failure so callers don't ship fake output as real.
    if (aiMockEnabled()) {
      console.error("[ai] explainIssue failed, falling back to mock", err);
      return mockExplanation(input);
    }
    console.error("[ai] explainIssue failed", err);
    throw new AiUnavailableError("AI request failed. Please try again later.");
  }
}
