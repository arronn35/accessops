/**
 * PATCH /api/remediation-tasks/:id — update status / assignee / notes
 * DELETE /api/remediation-tasks/:id
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { remediationTasks, workspaceMembers } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

const Patch = z.object({
  status: z
    .enum([
      "to_review",
      "planned",
      "in_progress",
      "needs_human_review",
      "fixed",
      "accepted_risk",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  title: z.string().min(2).max(240).optional(),
  description: z.string().max(4000).optional(),
  notes: z.string().max(4000).optional(),
  assignedToMemberId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = Patch.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    if (parsed.data.assignedToMemberId) {
      const [member] = await db
        .select({ id: workspaceMembers.id, status: workspaceMembers.status })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.id, parsed.data.assignedToMemberId),
            eq(workspaceMembers.workspaceId, ctx.workspaceId)
          )
        )
        .limit(1);
      if (!member || member.status !== "active") {
        throw new ApiError(400, "invalid_assignee");
      }
    }

    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.dueAt) updates.dueAt = new Date(parsed.data.dueAt);

    const result = await db
      .update(remediationTasks)
      .set(updates)
      .where(
        and(
          eq(remediationTasks.id, id),
          eq(remediationTasks.workspaceId, ctx.workspaceId)
        )
      )
      .returning({ id: remediationTasks.id });

    if (!result.length) throw new ApiError(404, "not_found");

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "task.updated",
      resourceType: "task",
      resourceId: id,
      metadata: parsed.data,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const result = await db
      .delete(remediationTasks)
      .where(
        and(
          eq(remediationTasks.id, id),
          eq(remediationTasks.workspaceId, ctx.workspaceId)
        )
      )
      .returning({ id: remediationTasks.id });
    if (!result.length) throw new ApiError(404, "not_found");
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "task.deleted",
      resourceType: "task",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
