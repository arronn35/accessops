/**
 * POST /api/remediation-tasks — create a task (typically from an issue)
 * GET  /api/remediation-tasks — list tasks for the active workspace
 */
import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  remediationTasks,
  accessibilityIssues,
  scanJobs,
} from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

const Schema = z.object({
  issueId: z.string().uuid().optional(),
  title: z.string().min(2).max(240),
  description: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum([
      "to_review",
      "planned",
      "in_progress",
      "needs_human_review",
      "fixed",
      "accepted_risk",
    ])
    .default("to_review"),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    if (parsed.data.issueId) {
      const [row] = await db
        .select({ scanWorkspaceId: scanJobs.workspaceId })
        .from(accessibilityIssues)
        .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
        .where(eq(accessibilityIssues.id, parsed.data.issueId))
        .limit(1);
      if (!row || row.scanWorkspaceId !== ctx.workspaceId) {
        throw new ApiError(404, "issue_not_found");
      }
    }

    const [task] = await db
      .insert(remediationTasks)
      .values({
        workspaceId: ctx.workspaceId,
        issueId: parsed.data.issueId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: parsed.data.status,
      })
      .returning();

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "task.created",
      resourceType: "task",
      resourceId: task.id,
    });

    return Response.json({ task }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET() {
  try {
    const ctx = await requireSession();
    const rows = await db
      .select()
      .from(remediationTasks)
      .where(eq(remediationTasks.workspaceId, ctx.workspaceId))
      .orderBy(desc(remediationTasks.createdAt));
    return Response.json({ tasks: rows });
  } catch (err) {
    return apiError(err);
  }
}
