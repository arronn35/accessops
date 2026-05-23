CREATE TYPE "public"."issue_impact" AS ENUM('minor', 'moderate', 'serious', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('critical', 'moderate', 'minor', 'passed', 'review');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('to_review', 'planned', 'in_progress', 'needs_human_review', 'fixed', 'accepted_risk', 'false_positive');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'developer', 'auditor', 'client_viewer', 'report_viewer');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'invited', 'removed');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('free', 'starter', 'agency', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('full', 'executive', 'csv');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scan_type" AS ENUM('single', 'multi', 'sitemap', 'manual');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('to_review', 'planned', 'in_progress', 'needs_human_review', 'fixed', 'accepted_risk');--> statement-breakpoint
CREATE TABLE "accessibility_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_job_id" uuid NOT NULL,
	"scan_page_id" uuid,
	"rule_id" varchar(100) NOT NULL,
	"impact" "issue_impact" DEFAULT 'moderate' NOT NULL,
	"severity" "issue_severity" DEFAULT 'moderate' NOT NULL,
	"wcag_tags_json" jsonb NOT NULL,
	"description" text NOT NULL,
	"help" text NOT NULL,
	"help_url" text,
	"target_json" jsonb,
	"html_snippet" text,
	"failure_summary" text,
	"human_review_required" boolean DEFAULT false NOT NULL,
	"false_positive" boolean DEFAULT false NOT NULL,
	"status" "issue_status" DEFAULT 'to_review' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "ai_explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"user_id" text,
	"explanation_plain" text NOT NULL,
	"remediation_summary" text,
	"code_fix_example" text,
	"framework" varchar(40),
	"model_provider" varchar(40) DEFAULT 'mock' NOT NULL,
	"consent_checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"workspace_id" uuid,
	"action" varchar(80) NOT NULL,
	"resource_type" varchar(40),
	"resource_id" text,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scan_data_retention_days" integer DEFAULT 365 NOT NULL,
	"screenshot_storage_enabled" boolean DEFAULT false NOT NULL,
	"ai_processing_enabled" boolean DEFAULT false NOT NULL,
	"region_preference" varchar(40) DEFAULT 'eu' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"base_url" text,
	"framework" varchar(40),
	"target_standard" varchar(40) DEFAULT 'wcag22aa',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid,
	"title" varchar(240) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'to_review' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assigned_to_member_id" uuid,
	"due_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scan_job_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"report_type" "report_type" DEFAULT 'full' NOT NULL,
	"summary_text" text,
	"disclaimer_text" text NOT NULL,
	"sections_json" jsonb,
	"export_path" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"requested_by" text NOT NULL,
	"scan_type" "scan_type" DEFAULT 'single' NOT NULL,
	"status" "scan_status" DEFAULT 'queued' NOT NULL,
	"base_url" text NOT NULL,
	"max_pages" integer DEFAULT 3 NOT NULL,
	"pages_discovered" integer DEFAULT 0 NOT NULL,
	"pages_scanned" integer DEFAULT 0 NOT NULL,
	"include_screenshots" boolean DEFAULT false NOT NULL,
	"store_screenshots" boolean DEFAULT false NOT NULL,
	"ai_explanations_enabled" boolean DEFAULT false NOT NULL,
	"ai_remediation_enabled" boolean DEFAULT false NOT NULL,
	"permission_confirmed" boolean DEFAULT false NOT NULL,
	"progress_step" varchar(40) DEFAULT 'queued',
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_job_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"status_code" integer,
	"scanned_at" timestamp,
	"screenshot_path" text,
	"raw_metadata_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan" "plan_tier" DEFAULT 'free' NOT NULL,
	"scans_used_today" integer DEFAULT 0 NOT NULL,
	"scans_used_this_month" integer DEFAULT 0 NOT NULL,
	"pages_scanned_this_month" integer DEFAULT 0 NOT NULL,
	"ai_requests_this_month" integer DEFAULT 0 NOT NULL,
	"reset_daily_at" timestamp DEFAULT now() NOT NULL,
	"reset_monthly_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_limits_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"full_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'developer' NOT NULL,
	"permissions_json" jsonb,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"company_name" varchar(200),
	"region" varchar(40) DEFAULT 'eu' NOT NULL,
	"plan" "plan_tier" DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accessibility_issues" ADD CONSTRAINT "accessibility_issues_scan_job_id_scan_jobs_id_fk" FOREIGN KEY ("scan_job_id") REFERENCES "public"."scan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessibility_issues" ADD CONSTRAINT "accessibility_issues_scan_page_id_scan_pages_id_fk" FOREIGN KEY ("scan_page_id") REFERENCES "public"."scan_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_issue_id_accessibility_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."accessibility_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_tasks" ADD CONSTRAINT "remediation_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_tasks" ADD CONSTRAINT "remediation_tasks_issue_id_accessibility_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."accessibility_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_tasks" ADD CONSTRAINT "remediation_tasks_assigned_to_member_id_workspace_members_id_fk" FOREIGN KEY ("assigned_to_member_id") REFERENCES "public"."workspace_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_scan_job_id_scan_jobs_id_fk" FOREIGN KEY ("scan_job_id") REFERENCES "public"."scan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_pages" ADD CONSTRAINT "scan_pages_scan_job_id_scan_jobs_id_fk" FOREIGN KEY ("scan_job_id") REFERENCES "public"."scan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_limits" ADD CONSTRAINT "usage_limits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_job_idx" ON "accessibility_issues" USING btree ("scan_job_id","severity");--> statement-breakpoint
CREATE INDEX "issues_page_idx" ON "accessibility_issues" USING btree ("scan_page_id");--> statement-breakpoint
CREATE INDEX "issues_rule_idx" ON "accessibility_issues" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "audit_workspace_idx" ON "audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_workspace_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "tasks_workspace_idx" ON "remediation_tasks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "reports_workspace_idx" ON "reports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "scan_jobs_workspace_idx" ON "scan_jobs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "scan_jobs_status_idx" ON "scan_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scan_pages_job_idx" ON "scan_pages" USING btree ("scan_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_ws_user" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");