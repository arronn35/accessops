import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { roleHasPermission } from "@/lib/entitlements";
import { explainIssue, AiUnavailableError } from "@/lib/ai/explain";
import { audit, findIssueInWorkspace, getPrivacySettings } from "@/lib/data/firestore";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_ai")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const found = await findIssueInWorkspace(ctx.workspaceId, id);
    if (!found) throw new ApiError(404, "not_found");
    const privacy = await getPrivacySettings(ctx.workspaceId);
    if (!privacy.aiProcessingEnabled) {
      throw new ApiError(409, "ai_processing_disabled", "Enable AI processing in Privacy & Compliance first.");
    }
    const rl = await checkRateLimit("aiExplain", ctx.userId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining, "Too many AI requests recently.");
    const body = (await req.json().catch(() => ({}))) as {
      framework?: string;
      mode?: "issue" | "react" | "client" | "test" | "html" | "shopify" | "wordpress";
      prompt?: string;
    };
    const explanation = await explainIssue({
      ruleId: found.issue.ruleId,
      description: found.issue.description,
      help: found.issue.help,
      wcagTags: found.issue.wcagTagsJson,
      htmlSnippet: found.issue.htmlSnippet ?? undefined,
      framework: body.framework,
      mode: body.mode,
      userPrompt: body.prompt,
    });
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "ai.explain",
      resourceType: "issue",
      resourceId: id,
      metadata: { provider: explanation.modelProvider, model: explanation.model ?? null },
    });
    const payload = {
        ...explanation,
        framework: body.framework ?? null,
        createdAt: new Date().toISOString(),
      };
    return Response.json({ explanation: payload, aiExplanation: payload });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return Response.json({ error: "ai_unavailable", message: err.message }, { status: 503 });
    }
    return apiError(err);
  }
}
