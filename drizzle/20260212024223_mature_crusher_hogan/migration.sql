DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_submission_type') THEN
        CREATE TYPE "support_submission_type" AS ENUM('help', 'feedback');
    END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SupportSubmission" (
	"id" serial PRIMARY KEY,
	"type" "support_submission_type" NOT NULL,
	"topic" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"email" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
