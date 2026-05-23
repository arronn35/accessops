ALTER TABLE "accessibility_issues" ADD COLUMN "contexts_json" jsonb;--> statement-breakpoint
CREATE TABLE "scan_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_job_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"grade" varchar(1) NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"issue_counts_json" jsonb NOT NULL,
	"category_scores_json" jsonb NOT NULL,
	"page_scores_json" jsonb NOT NULL,
	"wcag_issue_count" integer DEFAULT 0 NOT NULL,
	"best_practice_issue_count" integer DEFAULT 0 NOT NULL,
	"manual_review_count" integer DEFAULT 0 NOT NULL,
	"scoring_version" varchar(40) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_summaries" ADD CONSTRAINT "scan_summaries_scan_job_id_scan_jobs_id_fk" FOREIGN KEY ("scan_job_id") REFERENCES "public"."scan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scan_summaries_job_unique" ON "scan_summaries" USING btree ("scan_job_id");--> statement-breakpoint
CREATE INDEX "scan_summaries_score_idx" ON "scan_summaries" USING btree ("overall_score");
