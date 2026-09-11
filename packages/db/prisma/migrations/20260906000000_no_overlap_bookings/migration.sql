-- Booking invariant at the database level: a provider cannot hold two
-- live appointments whose half-open time ranges overlap. This backs the
-- application overlap check + Serializable transaction, so even a race that
-- slips both still fails safe on COMMIT instead of double-booking.
-- Live statuses mirror the application check (PENDING/CONFIRMED/IN_PROGRESS);
-- terminal states (COMPLETED/CANCELLED) are excluded from the predicate.
--
-- Implementation note: exclusion indexes require IMMUTABLE expressions, and
-- portable interval arithmetic over an INT column does not qualify. The range
-- is therefore materialized in a trigger-maintained column (plain column
-- references are always indexable) declared as Unsupported in the schema.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Materialized half-open range column.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "timeRange" tstzrange;

-- 2. Backfill existing rows.
UPDATE "appointments"
SET "timeRange" = tstzrange("scheduledAt", "scheduledAt" + "durationMinutes" * interval '1 minute')
WHERE "timeRange" IS NULL;

-- 3. Trigger keeps the range in sync on every write.
CREATE OR REPLACE FUNCTION "appointments_sync_time_range"()
RETURNS trigger AS $$
BEGIN
  NEW."timeRange" := tstzrange(NEW."scheduledAt", NEW."scheduledAt" + NEW."durationMinutes" * interval '1 minute');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "appointments_time_range_trigger" ON "appointments";
CREATE TRIGGER "appointments_time_range_trigger"
  BEFORE INSERT OR UPDATE OF "scheduledAt", "durationMinutes" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION "appointments_sync_time_range"();

-- 4. Collapse pre-existing overlaps (keeps the earliest booking per overlap).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a."id" AS loser
    FROM "appointments" a
    JOIN "appointments" b
      ON a."providerId" = b."providerId"
     AND a."id" < b."id"
     AND a."timeRange" && b."timeRange"
     AND a."status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
     AND b."status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
  LOOP
    DELETE FROM "appointments" WHERE "id" = r.loser;
  END LOOP;
END
$$;

-- 5. The invariant itself.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_provider_bookings') THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "no_overlapping_provider_bookings"
      EXCLUDE USING gist (
        "providerId" WITH =,
        "timeRange" WITH &&
      )
      WHERE ("status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS'));
  END IF;
END
$$;
