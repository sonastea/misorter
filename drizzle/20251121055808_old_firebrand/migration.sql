CREATE TYPE "public"."notice_type" AS ENUM('info', 'warning', 'error', 'success');--> statement-breakpoint
ALTER TABLE "Notice" ALTER COLUMN "type" SET DEFAULT 'info'::"public"."notice_type";--> statement-breakpoint
ALTER TABLE "Notice" ALTER COLUMN "type" SET DATA TYPE "public"."notice_type" USING "type"::"public"."notice_type";