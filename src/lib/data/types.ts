export type PlanTier = "free" | "starter" | "agency" | "team" | "enterprise";
export type WorkspaceRole =
  | "owner"
  | "admin"
  | "developer"
  | "auditor"
  | "client_viewer"
  | "report_viewer";
export type MemberStatus = "active" | "invited" | "removed";
export type ScanType = "single" | "multi" | "sitemap" | "manual";
export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type IssueSeverity = "critical" | "moderate" | "minor" | "passed" | "review";
export type IssueImpact = "minor" | "moderate" | "serious" | "critical";
export type IssueStatus =
  | "to_review"
  | "planned"
  | "in_progress"
  | "needs_human_review"
  | "fixed"
  | "accepted_risk"
  | "false_positive";
export type ReportType = "full" | "executive" | "csv";
export type VisualEvidenceStatus = "pending" | "captured" | "skipped" | "failed" | "redacted";

export interface User {
  id: string;
  uid?: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  fullName?: string | null;
  currentWorkspaceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  ownerUserId: string;
  name: string;
  companyName: string | null;
  region: string;
  framework: string | null;
  targetStandard: string;
  plan: PlanTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  permissionsJson?: Record<string, boolean> | null;
  status: MemberStatus;
  /** Last time this member opened the notifications panel (unread cutoff). */
  notificationsSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimits {
  id: string;
  workspaceId: string;
  plan: PlanTier;
  scansUsedToday: number;
  scansUsedThisMonth: number;
  pagesScannedThisMonth: number;
  aiRequestsThisMonth: number;
  resetDailyAt: Date;
  resetMonthlyAt: Date;
}

export interface PrivacySettings {
  id: string;
  workspaceId: string;
  scanDataRetentionDays: number;
  screenshotStorageEnabled: boolean;
  visualEvidenceEnabled: boolean;
  visualEvidenceRetentionDays: number;
  aiProcessingEnabled: boolean;
  regionPreference: string;
  updatedAt: Date;
}

export interface ScanJob {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  requestedBy: string;
  scanType: ScanType;
  status: ScanStatus;
  baseUrl: string;
  sourceUrlsJson?: { urls?: string[]; sitemapUrl?: string | null } | null;
  maxPages: number;
  pagesDiscovered: number;
  pagesScanned: number;
  includeScreenshots: boolean;
  storeScreenshots: boolean;
  visualEvidenceMaxScreenshots: number;
  aiExplanationsEnabled: boolean;
  aiRemediationEnabled: boolean;
  permissionConfirmed: boolean;
  progressStep: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  queueAttempts?: number;
  lastQueuePublishedAt?: Date | null;
  processorStartedAt?: Date | null;
  processorHeartbeatAt?: Date | null;
  processorError?: string | null;
  /** Worker instance id that currently owns this job (set on atomic claim). */
  claimedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanPage {
  id: string;
  scanJobId: string;
  url: string;
  title: string | null;
  statusCode: number | null;
  scannedAt: Date | null;
  screenshotPath?: string | null;
  rawMetadataJson?: unknown;
}

export interface AccessibilityIssue {
  id: string;
  scanJobId: string;
  scanPageId: string | null;
  groupId: string | null;
  ruleId: string;
  impact: IssueImpact;
  severity: IssueSeverity;
  wcagTagsJson: string[];
  description: string;
  help: string;
  helpUrl: string | null;
  targetJson?: string[] | null;
  contextsJson?: Array<{
    viewport: "desktop" | "tablet" | "mobile";
    state:
      | "initial"
      | "menu-open"
      | "dialog-open"
      | "accordion-open"
      | "tab-open"
      | "form-focus";
  }> | null;
  htmlSnippet: string | null;
  failureSummary: string | null;
  humanReviewRequired: boolean;
  falsePositive: boolean;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueGroup {
  id: string;
  scanJobId: string;
  rootCauseKey: string;
  ruleId: string;
  title: string;
  severity: IssueSeverity;
  affectedCount: number;
  primaryWcagTag: string | null;
  summary: string | null;
  recommendedFix: string | null;
  priority: number;
  createdAt: Date;
}

export interface ScanSummary {
  id: string;
  scanJobId: string;
  overallScore: number;
  grade: string;
  riskLevel: string;
  issueCountsJson: Record<string, number>;
  categoryScoresJson: Record<string, number>;
  pageScoresJson: unknown[];
  wcagIssueCount: number;
  bestPracticeIssueCount: number;
  manualReviewCount: number;
  scoringVersion: string;
  createdAt: Date;
}

export interface VisualEvidence {
  id: string;
  workspaceId: string;
  scanJobId: string;
  scanPageId: string | null;
  issueId: string;
  screenshotKey: string | null;
  imageDataBase64?: string | null;
  imageContentType?: string | null;
  screenshotStatus: VisualEvidenceStatus;
  selector: string | null;
  viewportJson?: unknown;
  state: string | null;
  boundingBoxJson?: unknown;
  redactionApplied: boolean;
  failureReason: string | null;
  expiresAt: Date;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface Report {
  id: string;
  workspaceId: string;
  scanJobId: string;
  title: string;
  reportType: ReportType;
  summaryText: string | null;
  disclaimerText: string;
  sectionsJson?: string[] | null;
  exportPath?: string | null;
  publicShareToken?: string | null;
  sharedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadataJson?: unknown;
  createdAt: Date;
}

export type DataDeletionJobStatus = "queued" | "running" | "completed" | "failed";

/**
 * Tracked asynchronous deletion of all scan data in a workspace.
 * Created by POST /api/privacy/delete-scan-data (202), claimed and executed
 * by the browser worker, and reported as completed only after a verification
 * pass confirms no scan data remains.
 */
export interface DataDeletionJob {
  id: string;
  workspaceId: string;
  scope: "all_scan_data";
  status: DataDeletionJobStatus;
  requestedBy: string;
  claimedBy: string | null;
  attempts: number;
  startedAt: Date | null;
  heartbeatAt: Date | null;
  completedAt: Date | null;
  /** Per-resource deleted-document counts, written when the job completes. */
  deletedCounts: Record<string, number> | null;
  /** Set when the post-delete verification pass found zero remaining docs. */
  verifiedAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedByUserId: string | null;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  createdAt: Date;
}

export interface RemediationTask {
  id: string;
  workspaceId: string;
  scanJobId: string | null;
  issueId: string | null;
  issueGroupId?: string | null;
  ruleId?: string | null;
  severity?: IssueSeverity | null;
  sourceUrl?: string | null;
  projectKey?: string | null;
  projectLabel?: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedToMemberId: string | null;
  dueAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
