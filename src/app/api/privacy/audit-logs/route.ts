import { apiError, requirePermission } from "@/lib/api/context";
import { listAuditLogs } from "@/lib/data/firestore";

export async function GET() {
  try {
    const ctx = await requirePermission("manage_privacy");
    return Response.json({ auditLogs: await listAuditLogs(ctx.workspaceId, 100) });
  } catch (err) {
    return apiError(err);
  }
}
