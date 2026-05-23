/**
 * GET /api/privacy/audit-logs — recent sensitive actions for the workspace.
 *
 * Owners and admins only — audit trails can reveal who accessed what.
 */
import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSession();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new ApiError(403, "forbidden");
    }
    const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 25));

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        metadataJson: auditLogs.metadataJson,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.workspaceId, ctx.workspaceId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return Response.json({ events: rows }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return apiError(err);
  }
}
