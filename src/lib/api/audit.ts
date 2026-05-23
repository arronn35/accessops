import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export interface AuditInput {
  userId?: string;
  workspaceId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Fire-and-forget from the caller's POV;
 * failures are logged but do not throw, so an audit hiccup never
 * blocks a real user action.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId,
      workspaceId: input.workspaceId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadataJson: input.metadata,
    });
  } catch (err) {
    console.error("[audit] failed", input.action, err);
  }
}
