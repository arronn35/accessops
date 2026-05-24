/**
 * DELETE /api/visual-evidence/:id
 *
 * Owners/admins can remove a single diagnostic screenshot. The metadata row
 * remains with deleted_at set so audit/history can explain why an image is gone.
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { visualEvidence } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { deleteVisualEvidenceObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }

    const { id } = await params;
    const [row] = await db
      .select()
      .from(visualEvidence)
      .where(
        and(
          eq(visualEvidence.id, id),
          eq(visualEvidence.workspaceId, ctx.workspaceId)
        )
      )
      .limit(1);

    if (!row) throw new ApiError(404, "not_found");
    if (row.screenshotKey) {
      await deleteVisualEvidenceObject(row.screenshotKey);
    }
    await db
      .update(visualEvidence)
      .set({
        screenshotKey: null,
        screenshotStatus: "skipped",
        failureReason: "expired_or_deleted",
        deletedAt: new Date(),
      })
      .where(eq(visualEvidence.id, id));

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "privacy.visual_evidence_deleted",
      resourceType: "visual_evidence",
      resourceId: id,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
