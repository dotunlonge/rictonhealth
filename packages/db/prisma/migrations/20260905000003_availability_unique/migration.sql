-- Availability upsert support: collapse duplicate (providerId, dayOfWeek) rows
-- keeping the most recently created, then enforce uniqueness.

DELETE FROM "provider_availability" a
USING "provider_availability" b
WHERE a."providerId" = b."providerId"
  AND a."dayOfWeek" = b."dayOfWeek"
  AND a."createdAt" < b."createdAt";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "provider_availability_providerId_dayOfWeek_key"
  ON "provider_availability"("providerId", "dayOfWeek");
