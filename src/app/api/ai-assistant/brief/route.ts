/**
 * POST /api/ai-assistant/brief
 *
 * Turns one scan's findings into a Markdown brief the user downloads as
 * a `.md` file from the AI Assistant page — the "compile the errors,
 * hand them to a coding agent" workflow.
 *
 * Gating mirrors POST /api/issues/:id/ai-explanation: workspace AI
 * consent, an explicit consent checkbox, a rate limit, and a 503 (never
 * fabricated output) when AI is not configured.
 */
import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  accessibilityIssues,
  privacySettings,
  scanJobs,
  scanPages,
  usageLimits,
} from "@/lib/db/schema";
import { apiError, ApiError, rateLimitError, requireSession } from "@/lib/api/context";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { audit } from "@/lib/api/audit";
import { AiUnavailableError } from "@/lib/ai/explain";
import { generateAssistantBrief, rankIssuesForBrief } from "@/lib/ai/assistant";
import {
  ASSISTANT_PRESET_IDS,
  assistantPresetLabel,
} from "@/lib/ai/presets";
import { COMPLIANCE_COPY } from "@/lib/microcopy/compliance";

const BodySchema = z.object({
  scanId: z.string().uuid(),
  preset: z.enum(ASSISTANT_PRESET_IDS),
  framework: z.string().min(1).max(60),
  prompt: z.string().max(2000).optional(),
  consentChecked: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "invalid_input",
        "Pick a scan and a preset, and confirm the AI review notice."
      );
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

    // 2. Rate limit — a brief costs far more than a single explanation.
    const rl = await checkRateLimit("aiAssistant", ctx.workspaceId);
    if (!rl.ok) throw rateLimitError(rl.reset, rl.remaining);

    // 3. Load + authorize the scan.
    const [scan] = await db
      .select()
      .from(scanJobs)
      .where(
        and(
          eq(scanJobs.id, parsed.data.scanId),
          eq(scanJobs.workspaceId, ctx.workspaceId)
        )
      )
      .limit(1);
    if (!scan) throw new ApiError(404, "scan_not_found");

    const issueRows = await db
      .select({
        ruleId: accessibilityIssues.ruleId,
        severity: accessibilityIssues.severity,
        impact: accessibilityIssues.impact,
        description: accessibilityIssues.description,
        help: accessibilityIssues.help,
        wcagTagsJson: accessibilityIssues.wcagTagsJson,
        htmlSnippet: accessibilityIssues.htmlSnippet,
        pageUrl: scanPages.url,
      })
      .from(accessibilityIssues)
      .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
      .where(eq(accessibilityIssues.scanJobId, scan.id));

    const counts = { critical: 0, moderate: 0, minor: 0, passed: 0, review: 0 };
    for (const i of issueRows) {
      if (i.severity in counts) counts[i.severity as keyof typeof counts]++;
    }

    const issues = rankIssuesForBrief(
      issueRows.map((i) => ({
        ruleId: i.ruleId,
        severity: i.severity,
        impact: i.impact,
        description: i.description,
        help: i.help,
        wcagTags: i.wcagTagsJson ?? [],
        pageUrl: i.pageUrl,
        htmlSnippet: i.htmlSnippet,
      }))
    );

    const siteLabel = hostFromUrl(scan.baseUrl);

    // 4. Generate. When AI isn't configured this throws rather than
    //    returning mock text dressed up as real analysis.
    let result;
    try {
      result = await generateAssistantBrief({
        preset: parsed.data.preset,
        framework: parsed.data.framework,
        siteLabel,
        pagesScanned: scan.pagesScanned,
        counts,
        issues,
        userPrompt: parsed.data.prompt,
      });
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        throw new ApiError(503, "ai_unavailable", err.message);
      }
      throw err;
    }

    const title = `${assistantPresetLabel(parsed.data.preset)} — ${siteLabel}`;
    const markdown = wrapMarkdown({
      title,
      siteLabel,
      baseUrl: scan.baseUrl,
      pagesScanned: scan.pagesScanned,
      framework: parsed.data.framework,
      scanDate: scan.completedAt ?? scan.createdAt,
      scanId: scan.id,
      modelProvider: result.modelProvider,
      body: result.markdown,
    });

    // 5. Usage + audit. Shares the AI counter with single-issue
    //    explanations — it's the same budget from the user's side.
    await db
      .update(usageLimits)
      .set({ aiRequestsThisMonth: sql`${usageLimits.aiRequestsThisMonth} + 1` })
      .where(eq(usageLimits.workspaceId, ctx.workspaceId));

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "ai.assistant_brief",
      resourceType: "scan_job",
      resourceId: scan.id,
      metadata: {
        preset: parsed.data.preset,
        framework: parsed.data.framework,
        modelProvider: result.modelProvider,
      },
    });

    return Response.json({
      title,
      filename: briefFilename(siteLabel, parsed.data.preset),
      markdown,
      modelProvider: result.modelProvider,
      rulesAnalyzed: issues.length,
    });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * Frame the model's Markdown with the metadata and disclaimers a
 * standalone `.md` file needs — the same reasoning as the trailing
 * DISCLAIMER row in the CSV export: the notice can't be separated from
 * the content it applies to.
 */
function wrapMarkdown(meta: {
  title: string;
  siteLabel: string;
  baseUrl: string;
  pagesScanned: number;
  framework: string;
  scanDate: Date;
  scanId: string;
  modelProvider: string;
  body: string;
}): string {
  return [
    `# ${meta.title}`,
    "",
    `> Generated by maitrico AccessOps AI on ${new Date().toISOString().slice(0, 10)}.`,
    ">",
    `> - Site: ${meta.baseUrl}`,
    `> - Pages scanned: ${meta.pagesScanned}`,
    `> - Target stack: ${meta.framework}`,
    `> - Scan date: ${meta.scanDate.toISOString().slice(0, 10)}`,
    `> - Scan reference: \`${meta.scanId}\``,
    `> - AI provider: ${meta.modelProvider}`,
    "",
    "---",
    "",
    meta.body.trim(),
    "",
    "---",
    "",
    "## Disclaimer",
    "",
    COMPLIANCE_COPY.REPORT_NOT_LEGAL,
    "",
    COMPLIANCE_COPY.AI_DISCLOSURE,
    "",
  ].join("\n");
}

function briefFilename(siteLabel: string, preset: string): string {
  const slug = siteLabel.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `accessops-${preset}-${slug}-${date}.md`;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
