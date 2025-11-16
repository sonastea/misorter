-- Add unique constraint to label column if it doesn't exist
-- This migration handles both fresh installs and existing databases

DO $$ 
BEGIN
  -- First, check if there's an existing index with this name (even without constraint)
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'Listing_label_unique'
  ) THEN
    -- If an index exists but it's not a constraint, drop it first
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'Listing_label_unique'
    ) THEN
      DROP INDEX IF EXISTS "Listing_label_unique";
    END IF;
  END IF;

  -- Now add the unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Listing_label_unique'
  ) THEN
    ALTER TABLE "Listing" ADD CONSTRAINT "Listing_label_unique" UNIQUE("label");
  END IF;
END $$;
