-- Fix sequences after Prisma to Drizzle migration
-- This ensures the sequences are set to the correct next value based on existing data

-- Fix Listing table sequence
SELECT setval(
  pg_get_serial_sequence('"Listing"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Listing"), 0) + 1,
  false
);

-- Fix Item table sequence  
SELECT setval(
  pg_get_serial_sequence('"Item"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Item"), 0) + 1,
  false
);

-- Fix Visit table sequence
SELECT setval(
  pg_get_serial_sequence('"Visit"', 'id'),
  COALESCE((SELECT MAX(id) FROM "Visit"), 0) + 1,
  false
);
