import { z } from "zod";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { roleHasPermission } from "@/lib/entitlements";
import { explainIssue, AiRequestError, AiUnavailableError } from "@/lib/ai/explain";
import { aiRequestErrorResponse } from "@/lib/ai/error-messages";
import {
  audit,
  getIssue,
  getPrivacySettings,
  getScanJob,
  saveAiExplanation,
} from "@/lib/data/firestore";

const BodySchema = z
  .object({
    scanJobId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9_-]+$/),
    // Backward-compatible field name: this acknowledges output limitations;
    // workspace and scan settings remain the data-processing consent gates.
    consentChecked: z.literal(true),
    framework: z
      .enum(["react", "html", "shopify", "wordpress", "webflow", "framer"])
      .default("react"),
    mode: z
      .enum(["issue", "react", "client", "test", "html", "shopify", "wordpress"])
      .default("issue"),
    prompt: z.string().trim().max(2000).optional(),
  })
  .strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_ai")) throw new ApiError(403, "forbidden");
    const { id } = await params;

    const parsed = BodySchema.safeParse(await req.json().catch(() => undefined));
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    const rl = await checkRateLimit("aiExplain", ctx.workspaceId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining, "Too many AI requests recently.");

    const input = parsed.data;
    const [scan, issue, privacy] = await Promise.all([
      getScanJob(ctx.workspaceId, input.scanJobId),
      getIssue(ctx.workspaceId, input.scanJobId, id),
      getPrivacySettings(ctx.workspaceId),
    ]);
    if (!scan || !issue) throw new ApiError(404, "not_found");
    if (!privacy.aiProcessingEnabled) {
      throw new ApiError(409, "ai_processing_disabled", "Enable AI processing in Privacy & Compliance first.");
    }
    if (!scan.aiExplanationsEnabled) {
      throw new ApiError(
        409,
        "ai_disabled_for_scan",
        "This scan was started with AI explanations turned off."
      );
    }

    const outputAcknowledgedAt = new Date().toISOString();
    const explanation = await explainIssue({
      ruleId: issue.ruleId,
      description: issue.description,
      help: issue.help,
      wcagTags: issue.wcagTagsJson,
      htmlSnippet: issue.htmlSnippet ?? undefined,
      framework: input.framework,
      mode: input.mode,
      userPrompt: input.prompt,
    });
    const stored = await saveAiExplanation(ctx.workspaceId, {
      scanJobId: scan.id,
      issueId: id,
      framework: input.framework,
      mode: input.mode,
      createdBy: ctx.userId,
      payload: explanation,
    });
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "ai.explain",
      resourceType: "issue",
      resourceId: id,
      metadata: {
        provider: explanation.modelProvider,
        model: explanation.model ?? null,
        scanId: scan.id,
        outputAcknowledgedAt,
      },
    });
    const payload = {
      ...explanation,
      framework: input.framework,
      createdAt: stored.createdAt.toISOString(),
    };
    return Response.json({ explanation: payload, aiExplanation: payload });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return Response.json({ error: "ai_unavailable", message: err.message }, { status: 503 });
    }
    if (err instanceof AiRequestError) {
      return aiRequestErrorResponse(err);
    }
    return apiError(err);
  }
}
