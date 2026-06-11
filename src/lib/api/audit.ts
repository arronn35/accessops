export interface AuditInput {
  userId?: string | null;
  workspaceId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: unknown;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    const data = await import("@/lib/data/firestore");
    await data.audit(input);
  } catch (err) {
    console.error("[audit] failed", input.action, err);
  }
}
