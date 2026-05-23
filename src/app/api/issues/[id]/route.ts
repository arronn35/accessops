/**
 * GET   /api/issues/:id — detail including joined page + scan + latest AI explanation
 * PATCH /api/issues/:id — update status / false_positive / human_review_required
 */
import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  accessibilityIssues,
  scanJobs,
  scanPages,
  aiExplanations,
} from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;

    const [row] = await db
      .select({
        issue: accessibilityIssues,
        page: scanPages,
        scan: scanJobs,
      })
      .from(accessibilityIssues)
      .leftJoin(scanPages, eq(accessibilityIssues.scanPageId, scanPages.id))
      .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
      .where(eq(accessibilityIssues.id, id))
      .limit(1);

    if (!row || row.scan?.workspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }

    const [latestAi] = await db
      .select()
      .from(aiExplanations)
      .where(eq(aiExplanations.issueId, id))
      .orderBy(desc(aiExplanations.createdAt))
      .limit(1);

    return Response.json({ ...row, aiExplanation: latestAi ?? null });
  } catch (err) {
    return apiError(err);
  }
}

const PatchSchema = z.object({
  status: z
    .enum([
      "to_review",
      "planned",
      "in_progress",
      "needs_human_review",
      "fixed",
      "accepted_risk",
      "false_positive",
    ])
    .optional(),
  falsePositive: z.boolean().optional(),
  humanReviewRequired: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    // Confirm the issue belongs to this workspace.
    const [check] = await db
      .select({ scanWorkspaceId: scanJobs.workspaceId })
      .from(accessibilityIssues)
      .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
      .where(eq(accessibilityIssues.id, id))
      .limit(1);
    if (!check || check.scanWorkspaceId !== ctx.workspaceId) {
      throw new ApiError(404, "not_found");
    }

    await db
      .update(accessibilityIssues)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(accessibilityIssues.id, id));

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "issue.updated",
      resourceType: "issue",
      resourceId: id,
      metadata: parsed.data,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
