/**
 * GET /api/privacy/export-workspace-data
 *
 * Returns a single JSON file containing every row this workspace owns.
 * Owners and admins only.
 *
 * Includes: scans, pages, issues, ai_explanations, tasks, reports,
 * privacy_settings, audit_logs, usage_limits.
 *
 * Streamed as a downloadable attachment to encourage local archival.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  scanJobs,
  scanPages,
  accessibilityIssues,
  aiExplanations,
  remediationTasks,
  reports,
  privacySettings,
  auditLogs,
  usageLimits,
  workspaces,
} from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

export async function GET() {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }

    const ws = (
      await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)).limit(1)
    )[0];
    const exportData = {
      workspace: ws,
      privacySettings: (
        await db
          .select()
          .from(privacySettings)
          .where(eq(privacySettings.workspaceId, ctx.workspaceId))
      )[0],
      usageLimits: (
        await db
          .select()
          .from(usageLimits)
          .where(eq(usageLimits.workspaceId, ctx.workspaceId))
      )[0],
      scans: await db
        .select()
        .from(scanJobs)
        .where(eq(scanJobs.workspaceId, ctx.workspaceId)),
      pages: await db
        .select()
        .from(scanPages)
        .leftJoin(scanJobs, eq(scanPages.scanJobId, scanJobs.id))
        .where(eq(scanJobs.workspaceId, ctx.workspaceId)),
      issues: await db
        .select()
        .from(accessibilityIssues)
        .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
        .where(eq(scanJobs.workspaceId, ctx.workspaceId)),
      aiExplanations: await db
        .select()
        .from(aiExplanations)
        .leftJoin(
          accessibilityIssues,
          eq(aiExplanations.issueId, accessibilityIssues.id)
        )
        .leftJoin(scanJobs, eq(accessibilityIssues.scanJobId, scanJobs.id))
        .where(eq(scanJobs.workspaceId, ctx.workspaceId)),
      remediationTasks: await db
        .select()
        .from(remediationTasks)
        .where(eq(remediationTasks.workspaceId, ctx.workspaceId)),
      reports: await db
        .select()
        .from(reports)
        .where(eq(reports.workspaceId, ctx.workspaceId)),
      auditLogs: await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.workspaceId, ctx.workspaceId)),
      exportedAt: new Date().toISOString(),
    };

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "privacy.workspace_exported",
    });

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="accessops-workspace-${ctx.workspaceId}.json"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
