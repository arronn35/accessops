ALTER TABLE "workspaces" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "stripe_current_period_end" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_stripe_customer_idx" ON "workspaces" ("stripe_customer_id") WHERE "stripe_customer_id" IS NOT NULL;
