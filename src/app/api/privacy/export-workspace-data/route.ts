import { apiError, requirePermission } from "@/lib/api/context";
import { audit, getPrivacySettings, getWorkspace, listAuditLogs, listReports, listScans } from "@/lib/data/firestore";

export async function GET() {
  try {
    const ctx = await requirePermission("manage_privacy");
    const data = {
      workspace: await getWorkspace(ctx.workspaceId),
      privacy: await getPrivacySettings(ctx.workspaceId),
      scans: await listScans(ctx.workspaceId, 500),
      reports: await listReports(ctx.workspaceId, 500),
      auditLogs: await listAuditLogs(ctx.workspaceId, 500),
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
