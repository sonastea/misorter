CREATE TYPE "activity_log_action" AS ENUM('listing_delete', 'listing_delete_many', 'listing_create', 'listing_update');--> statement-breakpoint
CREATE TABLE "ActivityLog" (
	"id" serial PRIMARY KEY,
	"action" "activity_log_action" NOT NULL,
	"targetLabel" varchar(16),
	"targetCount" integer DEFAULT 1 NOT NULL,
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt");