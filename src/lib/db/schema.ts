/**
 * Drizzle schema for maitrico AccessOps AI.
 * Covers Auth.js v5 tables + all 12 product tables from the brief.
 * Used by both the web app and the worker; keep this file dependency-free
 * beyond drizzle-orm/pg-core.
 */
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================
export const memberRole = pgEnum("member_role", [
  "owner",
  "admin",
  "developer",
  "auditor",
  "client_viewer",
  "report_viewer",
]);

export const memberStatus = pgEnum("member_status", ["active", "invited", "removed"]);

export const scanType = pgEnum("scan_type", ["single", "multi", "sitemap", "manual"]);

export const scanStatus = pgEnum("scan_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const issueSeverity = pgEnum("issue_severity", [
  "critical",
  "moderate",
  "minor",
  "passed",
  "review",
]);

export const issueImpact = pgEnum("issue_impact", [
  "minor",
  "moderate",
  "serious",
  "critical",
]);

export const issueStatus = pgEnum("issue_status", [
  "to_review",
  "planned",
  "in_progress",
  "needs_human_review",
  "fixed",
  "accepted_risk",
  "false_positive",
]);

export const taskStatus = pgEnum("task_status", [
  "to_review",
  "planned",
  "in_progress",
  "needs_human_review",
  "fixed",
  "accepted_risk",
]);

export const taskPriority = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);

export const reportType = pgEnum("report_type", ["full", "executive", "csv"]);

export const planTier = pgEnum("plan_tier", ["free", "starter", "agency", "team", "enterprise"]);

// ============================================================
// Auth.js v5 tables (Drizzle adapter expects these names)
// ============================================================
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ============================================================
// Workspaces
// ============================================================
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  companyName: varchar("company_name", { length: 200 }),
  region: varchar("region", { length: 40 }).default("eu").notNull(),
  framework: varchar("framework", { length: 40 }),
  targetStandard: varchar("target_standard", { length: 40 })
    .default("wcag22aa")
    .notNull(),
  plan: planTier("plan").default("free").notNull(),
  // Stripe billing linkage. Populated on first checkout completion;
  // subscriptionId/priceId/periodEnd reflect the current active sub.
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("developer"),
    permissionsJson: jsonb("permissions_json").$type<Record<string, boolean>>(),
    status: memberStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("workspace_members_ws_user").on(t.workspaceId, t.userId),
    index("workspace_members_user_idx").on(t.userId),
  ]
);

// ============================================================
// Workspace invitations
// ============================================================
/**
 * A pending invitation to join a workspace. Rows are deleted once
 * accepted; revoked invites keep `status="revoked"` for audit purposes
 * but cannot be accepted again. The token is opaque, urlsafe, and only
 * ever sent over email — never shown in the dashboard.
 */
export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    role: memberRole("role").notNull().default("developer"),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    token: varchar("token", { length: 80 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    acceptedAt: timestamp("accepted_at", { mode: "date" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("workspace_invitations_workspace_idx").on(t.workspaceId, t.status),
    uniqueIndex("workspace_invitations_pending_email_idx")
      .on(t.workspaceId, t.email)
      .where(sql`status = 'pending'`),
  ]
);

// ============================================================
// Projects
// ============================================================
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    baseUrl: text("base_url"),
    framework: varchar("framework", { length: 40 }),
    targetStandard: varchar("target_standard", { length: 40 }).default("wcag22aa"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("projects_workspace_idx").on(t.workspaceId)]
);

// ============================================================
// Scan jobs
// ============================================================
export const scanJobs = pgTable(
  "scan_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    scanType: scanType("scan_type").notNull().default("single"),
    status: scanStatus("status").notNull().default("queued"),
    baseUrl: text("base_url").notNull(),
    sourceUrlsJson: jsonb("source_urls_json").$type<{
      urls?: string[];
      sitemapUrl?: string | null;
    }>(),
    maxPages: integer("max_pages").notNull().default(3),
    pagesDiscovered: integer("pages_discovered").notNull().default(0),
    pagesScanned: integer("pages_scanned").notNull().default(0),
    includeScreenshots: boolean("include_screenshots").notNull().default(false),
    storeScreenshots: boolean("store_screenshots").notNull().default(false),
    aiExplanationsEnabled: boolean("ai_explanations_enabled").notNull().default(false),
    aiRemediationEnabled: boolean("ai_remediation_enabled").notNull().default(false),
    permissionConfirmed: boolean("permission_confirmed").notNull().default(false),
    progressStep: varchar("progress_step", { length: 40 }).default("queued"),
    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("scan_jobs_workspace_idx").on(t.workspaceId, t.createdAt),
    index("scan_jobs_status_idx").on(t.status),
  ]
);

// ============================================================
// Scan pages
// ============================================================
export const scanPages = pgTable(
  "scan_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanJobId: uuid("scan_job_id")
      .notNull()
      .references(() => scanJobs.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    statusCode: integer("status_code"),
    scannedAt: timestamp("scanned_at", { mode: "date" }),
    screenshotPath: text("screenshot_path"),
    rawMetadataJson: jsonb("raw_metadata_json"),
  },
  (t) => [index("scan_pages_job_idx").on(t.scanJobId)]
);

// ============================================================
// Accessibility issues
// ============================================================
export const accessibilityIssues = pgTable(
  "accessibility_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanJobId: uuid("scan_job_id")
      .notNull()
      .references(() => scanJobs.id, { onDelete: "cascade" }),
    scanPageId: uuid("scan_page_id").references(() => scanPages.id, {
      onDelete: "cascade",
    }),
    ruleId: varchar("rule_id", { length: 100 }).notNull(),
    impact: issueImpact("impact").notNull().default("moderate"),
    severity: issueSeverity("severity").notNull().default("moderate"),
    wcagTagsJson: jsonb("wcag_tags_json").$type<string[]>().notNull(),
    description: text("description").notNull(),
    help: text("help").notNull(),
    helpUrl: text("help_url"),
    targetJson: jsonb("target_json").$type<string[]>(),
    htmlSnippet: text("html_snippet"),
    failureSummary: text("failure_summary"),
    humanReviewRequired: boolean("human_review_required").notNull().default(false),
    falsePositive: boolean("false_positive").notNull().default(false),
    status: issueStatus("status").notNull().default("to_review"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("issues_job_idx").on(t.scanJobId, t.severity),
    index("issues_page_idx").on(t.scanPageId),
    index("issues_rule_idx").on(t.ruleId),
  ]
);

// ============================================================
// AI explanations
// ============================================================
export const aiExplanations = pgTable("ai_explanations", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => accessibilityIssues.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  explanationPlain: text("explanation_plain").notNull(),
  remediationSummary: text("remediation_summary"),
  codeFixExample: text("code_fix_example"),
  framework: varchar("framework", { length: 40 }),
  modelProvider: varchar("model_provider", { length: 40 }).notNull().default("mock"),
  consentChecked: boolean("consent_checked").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================
// Remediation tasks
// ============================================================
export const remediationTasks = pgTable(
  "remediation_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => accessibilityIssues.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("to_review"),
    priority: taskPriority("priority").notNull().default("medium"),
    assignedToMemberId: uuid("assigned_to_member_id").references(
      () => workspaceMembers.id,
      { onDelete: "set null" }
    ),
    dueAt: timestamp("due_at", { mode: "date" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("tasks_workspace_idx").on(t.workspaceId, t.status)]
);

// ============================================================
// Reports
// ============================================================
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    scanJobId: uuid("scan_job_id")
      .notNull()
      .references(() => scanJobs.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 240 }).notNull(),
    reportType: reportType("report_type").notNull().default("full"),
    summaryText: text("summary_text"),
    disclaimerText: text("disclaimer_text").notNull(),
    sectionsJson: jsonb("sections_json").$type<string[]>(),
    exportPath: text("export_path"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("reports_workspace_idx").on(t.workspaceId)]
);

// ============================================================
// Privacy settings (1:1 with workspace)
// ============================================================
export const privacySettings = pgTable("privacy_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  scanDataRetentionDays: integer("scan_data_retention_days").notNull().default(365),
  screenshotStorageEnabled: boolean("screenshot_storage_enabled").notNull().default(false),
  aiProcessingEnabled: boolean("ai_processing_enabled").notNull().default(false),
  regionPreference: varchar("region_preference", { length: 40 }).notNull().default("eu"),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================
// Audit logs
// ============================================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    action: varchar("action", { length: 80 }).notNull(),
    resourceType: varchar("resource_type", { length: 40 }),
    resourceId: text("resource_id"),
    metadataJson: jsonb("metadata_json"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_workspace_idx").on(t.workspaceId, t.createdAt),
    index("audit_user_idx").on(t.userId, t.createdAt),
  ]
);

// ============================================================
// Usage limits (rolling counters)
// ============================================================
export const usageLimits = pgTable("usage_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  plan: planTier("plan").notNull().default("free"),
  scansUsedToday: integer("scans_used_today").notNull().default(0),
  scansUsedThisMonth: integer("scans_used_this_month").notNull().default(0),
  pagesScannedThisMonth: integer("pages_scanned_this_month").notNull().default(0),
  aiRequestsThisMonth: integer("ai_requests_this_month").notNull().default(0),
  resetDailyAt: timestamp("reset_daily_at", { mode: "date" }).defaultNow().notNull(),
  resetMonthlyAt: timestamp("reset_monthly_at", { mode: "date" }).defaultNow().notNull(),
});

// ============================================================
// Inferred types for application code
// ============================================================
export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ScanJob = typeof scanJobs.$inferSelect;
export type ScanPage = typeof scanPages.$inferSelect;
export type AccessibilityIssue = typeof accessibilityIssues.$inferSelect;
export type AiExplanation = typeof aiExplanations.$inferSelect;
export type RemediationTask = typeof remediationTasks.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type PrivacySettings = typeof privacySettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UsageLimits = typeof usageLimits.$inferSelect;
