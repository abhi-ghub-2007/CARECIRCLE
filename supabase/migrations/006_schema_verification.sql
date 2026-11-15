-- ============================================================
-- Migration 006: Final Schema Notes
-- CareCircle Healthcare Management Platform
-- ============================================================
-- This file serves as the terminal migration marker.
-- All schema objects, indexes, RLS, functions, and cron jobs
-- are established by migrations 001–005.
--
-- To add future schema changes, create:
--   007_<description>.sql
-- and increment from there.
-- ============================================================

-- Confirm all extensions are present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'uuid-ossp extension is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension is missing';
  END IF;
END $$;

-- Confirm all core tables exist
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'elderly_profiles', 'care_relationships', 'invitations',
    'medications', 'medication_schedules', 'dose_events',
    'appointments', 'notifications', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      RAISE EXCEPTION 'Missing table: public.%', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'Schema verification passed — all tables present.';
END $$;
