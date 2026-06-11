import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import {
  audit,
  deleteRemediationTask,
  updateRemediationTask,
} from "@/lib/data/firestore";

const PatchSchema = z.object({
  title: z.string().min(2).max(240).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["to_do", "planned", "in_progress", "blocked", "fixed", "accepted_risk"]).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  assignedToMemberId: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("manage_remediation");
    const { id } = await params;
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const task = await updateRemediationTask(ctx.workspaceId, id, {
      ...parsed.data,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : parsed.data.dueAt === null ? null : undefined,
    });
    if (!task) throw new ApiError(404, "not_found");
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "task.updated",
      resourceType: "remediation_task",
      resourceId: id,
      metadata: parsed.data,
    });
    return Response.json({ task });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("manage_remediation");
    const { id } = await params;
    const ok = await deleteRemediationTask(ctx.workspaceId, id);
    if (!ok) throw new ApiError(404, "not_found");
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "task.deleted",
      resourceType: "remediation_task",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
