ALTER TABLE "workspaces" ADD COLUMN "framework" varchar(40);--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "target_standard" varchar(40) DEFAULT 'wcag22aa' NOT NULL;