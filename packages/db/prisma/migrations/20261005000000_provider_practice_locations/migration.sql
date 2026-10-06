-- Public practice locations power patient nearby-doctor discovery. These fields
-- must contain a clinic/facility location, never a provider's home address.
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "practiceAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "practiceCity" TEXT,
  ADD COLUMN IF NOT EXISTS "practiceState" TEXT,
  ADD COLUMN IF NOT EXISTS "practiceLatitude" DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS "practiceLongitude" DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS "practiceLocationVisible" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "provider_profiles_public_location_idx"
  ON "provider_profiles" ("practiceLocationVisible", "practiceLatitude", "practiceLongitude");
