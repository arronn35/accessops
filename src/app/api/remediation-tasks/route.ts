import { z } from "zod";
import { apiError, ApiError, requirePermission } from "@/lib/api/context";
import {
  audit,
  createRemediationTask,
  findIssueInWorkspace,
  listRemediationTasks,
} from "@/lib/data/firestore";

const CreateSchema = z.object({
  issueId: z.string().optional(),
  title: z.string().min(2).max(240),
  description: z.string().max(2000).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  assignedToMemberId: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  try {
    const ctx = await requirePermission("view_remediation");
    return Response.json({ tasks: await listRemediationTasks(ctx.workspaceId) });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("manage_remediation");
    const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    const issue = parsed.data.issueId
      ? await findIssueInWorkspace(ctx.workspaceId, parsed.data.issueId)
      : null;
    if (parsed.data.issueId && !issue) throw new ApiError(404, "issue_not_found");
    const task = await createRemediationTask(ctx.workspaceId, {
      issueId: parsed.data.issueId ?? null,
      scanJobId: issue?.scan.id ?? null,
      ruleId: issue?.issue.ruleId ?? null,
      severity: issue?.issue.severity ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? issue?.issue.description ?? null,
      priority: parsed.data.priority,
      assignedToMemberId: parsed.data.assignedToMemberId ?? null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      notes: parsed.data.notes ?? null,
    });
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "task.created",
      resourceType: "remediation_task",
      resourceId: task.id,
    });
    return Response.json({ task }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
