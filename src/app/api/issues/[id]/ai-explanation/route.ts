/**
 * POST /api/issues/:id/ai-explanation
 *
 * Generates an AI explanation, gated by the workspace's
 * privacy_settings.ai_processing_enabled toggle.
 *
 * Returns 403 with code "ai_disabled" when the toggle is off — UI shows
 * a link to the Privacy & Compliance Center.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  accessibilityIssues,
  aiExplanations,
  privacySettings,
  scanJobs,
  usageLimits,
} from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit } from "@/lib/api/audit";
import { explainIssue, AiUnavailableError } from "@/lib/ai/explain";

const BodySchema = z.object({
  framework: z.string().max(40).optional(),
  consentChecked: z.literal(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "consent_required", "Consent checkbox required.");
    }

    // 1. Workspace AI consent gate.
    const [privacy] = await db
      .select()
      .from(privacySettings)
      .where(eq(privacySettings.workspaceId, ctx.workspaceId))
      .limit(1);
    if (!privacy?.aiProcessingEnabled) {
      throw new ApiError(
        403,
        "ai_disabled",
        "AI processing is disabled. Enable it in Privacy & Compliance Center."
      );
    }

    // 2. Rate limit.
    const rl = await checkRateLimit("aiExplain", ctx.workspaceId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining);

    // 3. Load + authorize the issue.
    const [row] = await db
      .select({ issue: accessibilityIssues, scan: scanJobs })
      .from(accessibilityIssues)
      .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
      .where(eq(accessibilityIssues.id, id))
      .limit(1);
    if (!row || row.scan?.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }

    // 4. Call AI. When AI is not configured, explainIssue throws
    //    AiUnavailableError — surfaced to the client as 503, never mock.
    let result;
    try {
      result = await explainIssue({
        ruleId: row.issue.ruleId,
        description: row.issue.description,
        help: row.issue.help,
        wcagTags: row.issue.wcagTagsJson ?? [],
        htmlSnippet: row.issue.htmlSnippet ?? undefined,
        framework: parsed.data.framework,
      });
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        throw new ApiError(503, "ai_unavailable", err.message);
      }
      throw err;
    }

    // 5. Persist.
    const [saved] = await db
      .insert(aiExplanations)
      .values({
        issueId: id,
        userId: ctx.userId,
        explanationPlain: result.explanationPlain,
        remediationSummary: result.remediationSummary,
        codeFixExample: result.codeFixExample,
        framework: parsed.data.framework,
        modelProvider: result.modelProvider,
        consentChecked: true,
      })
      .returning();

    // 6. Usage + audit.
    await db
      .update(usageLimits)
      .set({ aiRequestsThisMonth: sql`${usageLimits.aiRequestsThisMonth} + 1` })
      .where(eq(usageLimits.workspaceId, ctx.workspaceId));

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "ai.explain",
      resourceType: "issue",
      resourceId: id,
      metadata: { modelProvider: result.modelProvider },
    });

    return Response.json({ aiExplanation: saved });
  } catch (err) {
    return apiError(err);
  }
}
