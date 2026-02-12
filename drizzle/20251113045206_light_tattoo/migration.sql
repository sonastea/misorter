-- Tables already exist from Prisma migration, only create if missing
CREATE TABLE IF NOT EXISTS "Item" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"listingLabel" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Listing" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(16) NOT NULL,
	"title" varchar(255) DEFAULT 'misorter' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Visit" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"listingLabel" varchar(255) NOT NULL,
	"source" varchar(255)
);
--> statement-breakpoint
-- Indexes already exist from Prisma, only create if missing
CREATE INDEX IF NOT EXISTS "Item_listingLabel_idx" ON "Item" USING btree ("listingLabel");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Visit_listingLabel_idx" ON "Visit" USING btree ("listingLabel");
--> statement-breakpoint
-- Rename Prisma's unique constraint to match Drizzle's naming convention
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Listing_label_key'
  ) THEN
    ALTER TABLE "Listing" RENAME CONSTRAINT "Listing_label_key" TO "Listing_label_unique";
  END IF;
END $$;
--> statement-breakpoint
-- Add unique constraint if it doesn't exist (for fresh installs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Listing_label_unique'
  ) THEN
    ALTER TABLE "Listing" ADD CONSTRAINT "Listing_label_unique" UNIQUE("label");
  END IF;
END $$;