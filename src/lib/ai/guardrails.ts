/**
 * Compliance guardrails shared by every AI surface in the product.
 *
 * AccessOps AI is an assessment aid, not a certification service. Two
 * things enforce that on model output:
 *
 *   1. `COMPLIANCE_RULES` — the prohibitions every system prompt embeds.
 *   2. `sanitizeAiOutput()` — a post-processing pass that redacts the
 *      phrases anyway, because a prompt is a request, not a guarantee.
 *
 * Both live here rather than in one caller so a new AI feature can't
 * quietly ship with a weaker version of the rules.
 */

/** Prohibitions appended verbatim to every AI system prompt. */
export const COMPLIANCE_RULES = `Forbidden:
- Claiming a website is or will be "compliant" with any law or standard
- Claiming WCAG, ADA, EAA, Section 508, or EN 301 549 compliance
- Issuing or implying certification
- Recommending accessibility overlay widgets as a substitute for real fixes
- Saying "fully compliant", "100% compliant", "certified", or "legally compliant"`;

/** The line every AI response must end with. */
export const AI_REVIEW_FOOTER =
  "AI-generated suggestion. Review before implementation.";

const FORBIDDEN_PHRASES = [
  /fully[\s-]?compliant/gi,
  /100%[\s-]?compliant/gi,
  /legally[\s-]?compliant/gi,
  /guaranteed[\s-]?compliance/gi,
  /\bcertified\b/gi,
];

/** Redact forbidden compliance claims from model output. */
export function sanitizeAiOutput(text: string): string {
  let out = text;
  for (const re of FORBIDDEN_PHRASES) {
    out = out.replace(re, "[removed]");
  }
  return out.trim();
}
