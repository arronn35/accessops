import { apiError, requirePermission } from "@/lib/api/context";
import {
  audit,
  getPrivacySettings,
  getScanSummary,
  getWorkspace,
  listAuditLogs,
  listIssueGroups,
  listIssues,
  listPendingInvitations,
  listRemediationTasks,
  listReports,
  listScanPages,
  listScans,
  listVisualEvidenceMeta,
  listWorkspaceMembers,
} from "@/lib/data/firestore";

// Full-detail export can touch thousands of documents.
export const maxDuration = 300;

const MAX_SCANS = 200;

/**
 * Complete workspace data export (JSON): workspace, privacy settings,
 * members, scans with pages/issues/groups/summaries, remediation tasks,
 * reports, visual-evidence metadata (no image bytes), and audit logs.
 */
export async function GET() {
  try {
    const ctx = await requirePermission("manage_privacy");

    const scans = await listScans(ctx.workspaceId, MAX_SCANS);
    const scansWithResults = [];
    for (const scan of scans) {
      const [pages, issues, groups, summary] = await Promise.all([
        listScanPages(ctx.workspaceId, scan.id),
        listIssues(ctx.workspaceId, scan.id),
        listIssueGroups(ctx.workspaceId, scan.id),
        getScanSummary(ctx.workspaceId, scan.id),
      ]);
      scansWithResults.push({ ...scan, pages, issues, groups, summary });
    }

    const data = {
      schema: "accessops-workspace-export-v2",
      workspace: await getWorkspace(ctx.workspaceId),
      privacy: await getPrivacySettings(ctx.workspaceId),
      members: await listWorkspaceMembers(ctx.workspaceId),
      pendingInvitations: await listPendingInvitations(ctx.workspaceId),
      scans: scansWithResults,
      remediationTasks: await listRemediationTasks(ctx.workspaceId, 1000),
      reports: await listReports(ctx.workspaceId, 500),
      visualEvidence: await listVisualEvidenceMeta(ctx.workspaceId),
      auditLogs: await listAuditLogs(ctx.workspaceId, 500),
      notes:
        "Visual evidence is exported as metadata only; screenshot bytes are excluded. AI explanations are generated on demand and are not stored.",
      exportedAt: new Date().toISOString(),
    };
    await audit({ userId: ctx.userId, workspaceId: ctx.workspaceId, action: "privacy.workspace_exported", resourceType: "workspace", resourceId: ctx.workspaceId });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="accessops-workspace-${ctx.workspaceId}.json"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
