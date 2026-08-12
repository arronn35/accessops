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
/**
 * Fine-grained lifecycle for the per-page job model (Phase 3). Orthogonal to
 * `status`: a scan with status "completed" may have phase "completed" (clean)
 * or "completed_with_errors" (some pages failed). Absent on legacy scans.
 */
export type ScanPhase =
  | "crawling"
  | "scanning"
  | "aggregating"
  | "completed"
  | "completed_with_errors"
  | "failed";
export type PageJobStatus = "queued" | "running" | "completed" | "failed";
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
  /** Polar (billing) linkage. Absent until the workspace first checks out. */
  polarCustomerId?: string | null;
  polarSubscriptionId?: string | null;
  /** Last subscription status seen from a Polar webhook (active, canceled, …). */
  subscriptionStatus?: string | null;
  /** End of the current paid period; the plan is honored until then. */
  currentPeriodEnd?: Date | null;
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
  statementContactEmail?: string | null;
  statementLimitations?: string | null;
  statementPublished?: boolean;
  updatedAt: Date;
}

/**
 * Worker-written lifecycle timestamps, used for diagnostics only.
 * Written via transaction-free merge writes; absent on scans created
 * before this field existed or never picked up by the worker.
 */
export interface ScanTimings {
  claimedAt?: Date | null;
  browserStartedAt?: Date | null;
  firstPageStartedAt?: Date | null;
  lastProgressAt?: Date | null;
  finishedAt?: Date | null;
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
  timings?: ScanTimings | null;
  /** Times the sweeper has reset this job from stale-running back to queued. */
  reclaimAttempts?: number;
  /** Machine-readable failure code (errorMessage carries the user-facing text). */
  errorCode?: string | null;
  /**
   * Realtime progress fields written by the worker as plain merge writes
   * (no transaction). Read directly by the progress page via onSnapshot.
   */
  pagesDone?: number;
  pagesTotal?: number;
  currentUrl?: string | null;
  currentStep?: string | null;
  /** Sub-page detail, e.g. the viewport currently being analyzed. */
  currentState?: string | null;
  lastProgressAt?: Date | null;
  /** Per-page job model (Phase 3). Absent on legacy monolithic scans. */
  phase?: ScanPhase | null;
  pagesFailed?: number;
  /**
   * Stamped at creation when PAGE_JOBS_ENABLED. The worker uses the per-page
   * path iff this is true, so scans created before the flag (or before this
   * deploy) always run on the legacy monolithic path.
   */
  usePageJobs?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One independent per-page unit of work (Phase 3), stored at
 * scans/{scanId}/pageJobs/{pageJobId}. Claimed and run independently so a
 * single hanging/broken page cannot stall or sink the whole scan.
 */
export interface PageJob {
  id: string;
  scanJobId: string;
  workspaceId: string;
  url: string;
  status: PageJobStatus;
  attempts: number;
  maxAttempts: number;
  claimedBy?: string | null;
  heartbeatAt?: Date | null;
  deadlineMs: number;
  error?: string | null;
  errorCode?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
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
  /** Absent on summaries created before failed-page-aware scoring. */
  pagesFailedToScan?: number;
  /** Failed URLs are reported separately and are not present in pageScoresJson. */
  failedPageUrls?: string[];
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

/** How often a monitor re-scans its target. */
export type MonitorFrequency = "daily" | "every_3_days" | "weekly";
export type MonitorStatus = "active" | "paused";

/**
 * A continuous-monitoring schedule (Layer 2). The scheduler queries active
 * monitors whose `nextRunAt` is due and enqueues a normal scan job for each,
 * reusing the existing scan pipeline. Stored at
 * `workspaces/{workspaceId}/monitors/{id}` and accessed server-side only.
 */
export interface Monitor {
  id: string;
  workspaceId: string;
  /** Human-friendly name; defaults to the target host. */
  name: string;
  targetUrl: string;
  frequency: MonitorFrequency;
  status: MonitorStatus;
  /** Scan options applied each run. Kept shallow to bound monitor compute. */
  scanConfig: {
    scanType: ScanType;
    maxPages: number;
    includeScreenshots: boolean;
  };
  /** The field the scheduler queries: due when status==active && nextRunAt<=now. */
  nextRunAt: Date;
  lastRunAt: Date | null;
  /** Most recent scan job produced by this monitor; the diff baseline. */
  lastScanId: string | null;
  alertChannels: {
    email: string[];
    slackWebhookUrl?: string | null;
  };
  alertThreshold: {
    onNewCritical: boolean;
    /** Alert when the score drops by at least this many points (0 = off). */
    onScoreDropBy: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
