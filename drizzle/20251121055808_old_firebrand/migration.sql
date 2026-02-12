DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notice_type') THEN
        CREATE TYPE "public"."notice_type" AS ENUM('info', 'warning', 'error', 'success');
    END IF;
END $$;--> statement-breakpoint
ALTER TABLE "Notice" ALTER COLUMN "type" SET DEFAULT 'info'::"public"."notice_type";--> statement-breakpoint
ALTER TABLE "Notice" ALTER COLUMN "type" SET DATA TYPE "public"."notice_type" USING "type"::"public"."notice_type";