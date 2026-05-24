CREATE TYPE "public"."visual_evidence_status" AS ENUM('pending', 'captured', 'skipped', 'failed', 'redacted');--> statement-breakpoint
ALTER TABLE "scan_jobs" ADD COLUMN "visual_evidence_max_screenshots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "visual_evidence_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "visual_evidence_retention_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
CREATE TABLE "visual_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"scan_job_id" uuid NOT NULL,
	"scan_page_id" uuid,
	"issue_id" uuid NOT NULL,
	"screenshot_key" text,
	"screenshot_status" "visual_evidence_status" DEFAULT 'pending' NOT NULL,
	"selector" text,
	"viewport_json" jsonb,
	"state" varchar(40),
	"bounding_box_json" jsonb,
	"redaction_applied" boolean DEFAULT false NOT NULL,
	"failure_reason" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "visual_evidence" ADD CONSTRAINT "visual_evidence_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_evidence" ADD CONSTRAINT "visual_evidence_scan_job_id_scan_jobs_id_fk" FOREIGN KEY ("scan_job_id") REFERENCES "public"."scan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_evidence" ADD CONSTRAINT "visual_evidence_scan_page_id_scan_pages_id_fk" FOREIGN KEY ("scan_page_id") REFERENCES "public"."scan_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_evidence" ADD CONSTRAINT "visual_evidence_issue_id_accessibility_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."accessibility_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visual_evidence_workspace_idx" ON "visual_evidence" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "visual_evidence_issue_idx" ON "visual_evidence" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "visual_evidence_expiry_idx" ON "visual_evidence" USING btree ("expires_at","deleted_at");
