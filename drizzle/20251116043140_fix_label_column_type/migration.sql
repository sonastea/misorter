-- Fix label column type from CHAR(16) to VARCHAR(16)
-- Prisma used CHAR but Drizzle schema specifies VARCHAR

ALTER TABLE "Listing" 
ALTER COLUMN "label" TYPE varchar(16);
