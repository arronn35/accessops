import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, findIssueInWorkspace, updateIssue } from "@/lib/data/firestore";
import { roleHasPermission } from "@/lib/entitlements";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "view_scans")) throw new ApiError(403, "forbidden");
    const { id } = await params;
    const found = await findIssueInWorkspace(ctx.workspaceId, id);
    if (!found) throw new ApiError(404, "not_found");
    return Response.json(found);
  } catch (err) {
    return apiError(err);
  }
}

const IssuePatchSchema = z
  .object({
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
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

/** Persist triage updates (status, false-positive, human-review flags). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    if (!roleHasPermission(ctx.role, "manage_remediation")) throw new ApiError(403, "forbidden");
    const { id } = await params;

    const parsed = IssuePatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input", parsed.error.issues[0]?.message);
    }

    const found = await findIssueInWorkspace(ctx.workspaceId, id);
    if (!found) throw new ApiError(404, "not_found");

    const patch = { ...parsed.data };
    // Marking false positive implies the matching status (and vice versa)
    // so the two fields cannot drift apart.
    if (patch.falsePositive === true && !patch.status) patch.status = "false_positive";
    if (patch.status === "false_positive") patch.falsePositive = true;

    const updated = await updateIssue(ctx.workspaceId, found.scan.id, id, patch);
    if (!updated) throw new ApiError(404, "not_found");

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "issue.updated",
      resourceType: "issue",
      resourceId: id,
      metadata: patch,
    });
    return Response.json({ ok: true, issue: updated });
  } catch (err) {
    return apiError(err);
  }
}
