import { z } from "zod";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { explainIssue, AiRequestError, AiUnavailableError } from "@/lib/ai/explain";
import { aiRequestErrorResponse } from "@/lib/ai/error-messages";
import { buildAiScanContext } from "@/lib/ai/scan-context";
import type { AccessibilityIssue, IssueGroup, ScanPage } from "@/lib/data/types";
import {
  audit,
  getPrivacySettings,
  getScanJob,
  listIssueGroups,
  listIssues,
  listScanPages,
  saveAssistantResult,
} from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

const Schema = z.object({
  prompt: z.string().min(3).max(4000),
  framework: z.string().max(80).default("React / Next.js"),
  preset: z.enum(["explain", "react", "html", "shopify", "wordpress", "test", "client"]).default("explain"),
  scanJobId: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_ai")) throw new ApiError(403, "forbidden");
    const privacy = await getPrivacySettings(ctx.workspaceId);
    if (!privacy.aiProcessingEnabled) {
      throw new ApiError(409, "ai_processing_disabled", "Enable AI processing in Privacy & Compliance first.");
    }
    const parsed = Schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const rl = await checkRateLimit("aiExplain", ctx.userId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining, "Too many AI requests recently.");

    const scan = await getScanJob(ctx.workspaceId, parsed.data.scanJobId);
    if (!scan) throw new ApiError(404, "scan_not_found");
    let issues: AccessibilityIssue[] = [];
    let pages: ScanPage[] = [];
    let groups: IssueGroup[] = [];
    [issues, pages, groups] = await Promise.all([
      listIssues(ctx.workspaceId, scan.id),
      listScanPages(ctx.workspaceId, scan.id),
      listIssueGroups(ctx.workspaceId, scan.id),
    ]);
    const primaryIssue = issues.find((issue) => issue.severity === "critical") ?? issues[0] ?? null;

    const result = await explainIssue({
      ruleId: primaryIssue?.ruleId ?? "assistant-request",
      description: primaryIssue?.description ?? "User-requested accessibility analysis.",
      help: primaryIssue?.help ?? "Generate accessible, review-ready coding guidance.",
      wcagTags: primaryIssue?.wcagTagsJson ?? [],
      htmlSnippet: primaryIssue?.htmlSnippet ?? undefined,
      framework: parsed.data.framework,
      mode: parsed.data.preset === "explain" ? "issue" : parsed.data.preset,
      userPrompt: parsed.data.prompt,
      projectContext: buildAiScanContext({ scan, issues, pages, groups }),
    });

    const primaryIssueSnippet = primaryIssue?.htmlSnippet ?? null;
    const stored = await saveAssistantResult(ctx.workspaceId, {
      scanJobId: scan.id,
      preset: parsed.data.preset,
      framework: parsed.data.framework,
      primaryIssueSnippet,
      createdBy: ctx.userId,
      payload: result,
    });

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "ai.assistant",
      resourceType: "scan_job",
      resourceId: scan.id,
      metadata: { preset: parsed.data.preset, model: result.model ?? null, scanJobId: scan.id },
    });
    return Response.json({
      result: {
        ...result,
        preset: stored.preset,
        framework: stored.framework,
        primaryIssueSnippet: stored.primaryIssueSnippet,
        createdAt: stored.createdAt.toISOString(),
      },
    });
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
