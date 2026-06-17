/**
 * Maps workspace audit-log entries to the notification shape the
 * NotificationsBell client renders: { id, title, body, href, createdAt }.
 * Pure functions — no Firestore access — so the contract is unit-testable.
 */
import type { AuditLog } from "@/lib/data/types";

export interface UiNotification {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
}

const TITLES: Record<string, string> = {
  "scan.created": "Scan started",
  "scan.retried": "Scan retried",
  "scan.deleted": "Scan deleted",
  "issue.updated": "Issue updated",
  "task.created": "Remediation task created",
  "task.updated": "Remediation task updated",
  "task.deleted": "Remediation task deleted",
  "report.created": "Report created",
  "report.exported": "Report exported",
  "report.shared": "Report share link created",
  "report.share_revoked": "Report share link revoked",
  "ai.explain": "AI explanation generated",
  "team.invitation_created": "Team invitation sent",
  "team.invitation_revoked": "Team invitation revoked",
  "team.invitation_accepted": "Team member joined",
  "privacy.settings_updated": "Privacy settings updated",
  "privacy.scan_data_deletion_requested": "Scan data deletion requested",
  "privacy.all_scans_deleted": "All scan data deleted",
  "privacy.retention_purge": "Retention cleanup ran",
  "visual_evidence.deleted": "Visual evidence deleted",
  "plan.selected": "Plan changed",
};

function humanize(action: string): string {
  const text = action.replace(/[._]/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function hrefFor(log: AuditLog): string | null {
  const action = log.action;
  if (action.startsWith("scan.") && log.resourceType === "scan" && log.resourceId) {
    return action === "scan.deleted" ? "/app" : `/app/scans/${log.resourceId}`;
  }
  if (action.startsWith("task.")) return "/app/remediation";
  if (action.startsWith("report.")) return "/app/reports/builder";
  if (action.startsWith("team.")) return "/app/team";
  if (action.startsWith("privacy.") || action.startsWith("visual_evidence."))
    return "/app/compliance";
  if (action.startsWith("plan.")) return "/app/settings/billing";
  return null;
}

function bodyFor(log: AuditLog): string | null {
  const meta = (log.metadataJson ?? {}) as Record<string, unknown>;
  if (log.action === "issue.updated" && typeof meta.status === "string") {
    return `Status changed to ${String(meta.status).replace(/_/g, " ")}.`;
  }
  if (log.action === "task.updated" && typeof meta.status === "string") {
    return `Status changed to ${String(meta.status).replace(/_/g, " ")}.`;
  }
  if (log.action === "privacy.all_scans_deleted") {
    return "The deletion job finished and was verified.";
  }
  if (log.action === "ai.explain" && typeof meta.model === "string" && meta.model) {
    return `Model: ${meta.model}.`;
  }
  return null;
}

export function toUiNotification(log: AuditLog): UiNotification {
  return {
    id: log.id,
    title: TITLES[log.action] ?? humanize(log.action),
    body: bodyFor(log),
    href: hrefFor(log),
    createdAt: log.createdAt.toISOString(),
  };
}

export function countUnread(logs: AuditLog[], lastSeenAt: Date | null): number {
  if (!lastSeenAt) return logs.length;
  return logs.filter((log) => log.createdAt > lastSeenAt).length;
}
