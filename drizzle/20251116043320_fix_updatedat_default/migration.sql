-- Fix updatedAt column to have a default value of now()
-- This matches the Drizzle schema definition

ALTER TABLE "Listing" 
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
