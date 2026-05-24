/**
 * POST /api/privacy/delete-scan-data
 *
 * Deletes scan data for the workspace. Two modes:
 *   - { scanJobId } — delete one scan + its pages + issues + reports
 *   - { all: true, confirm: "DELETE" } — wipe ALL scan data for the workspace
 *
 * Owners and admins only. Always audit-logged.
 */
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { scanJobs, visualEvidence } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";
import { deleteVisualEvidenceObject } from "@/lib/storage/r2";

const Schema = z.union([
  z.object({ scanJobId: z.string().uuid() }),
  z.object({ all: z.literal(true), confirm: z.literal("DELETE") }),
]);

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "invalid_input");

    if ("scanJobId" in parsed.data) {
      const scanJobId = parsed.data.scanJobId;
      const [job] = await db
        .select({ id: scanJobs.id, workspaceId: scanJobs.workspaceId })
        .from(scanJobs)
        .where(eq(scanJobs.id, scanJobId))
        .limit(1);
      if (!job || job.workspaceId !== ctx.workspaceId) {
        throw new ApiError(404, "not_found");
      }
      const evidenceRows = await db
        .select({ screenshotKey: visualEvidence.screenshotKey })
        .from(visualEvidence)
        .where(eq(visualEvidence.scanJobId, scanJobId));
      await Promise.all(
        evidenceRows
          .map((row) => row.screenshotKey)
          .filter(Boolean)
          .map((key) => deleteVisualEvidenceObject(key!))
      );
      // Deleting the scan_jobs row cascades: scan_pages → accessibility_issues
      // → ai_explanations, and scan_jobs → reports. remediation_tasks linked
      // to those issues are removed by the ON DELETE CASCADE on
      // remediation_tasks.issue_id. Manual tasks (no issue_id) are correctly
      // left intact.
      await db.delete(scanJobs).where(eq(scanJobs.id, scanJobId));

      await audit({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        action: "privacy.scan_deleted",
        resourceType: "scan_job",
        resourceId: scanJobId,
      });

      return Response.json({ ok: true });
    }

    // All-scans wipe.
    const evidenceRows = await db
      .select({ screenshotKey: visualEvidence.screenshotKey })
      .from(visualEvidence)
      .where(eq(visualEvidence.workspaceId, ctx.workspaceId));
    await Promise.all(
      evidenceRows
        .map((row) => row.screenshotKey)
        .filter(Boolean)
        .map((key) => deleteVisualEvidenceObject(key!))
    );
    await db.delete(scanJobs).where(eq(scanJobs.workspaceId, ctx.workspaceId));
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "privacy.all_scans_deleted",
    });
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
