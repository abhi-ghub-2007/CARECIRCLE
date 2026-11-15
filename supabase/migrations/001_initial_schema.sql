-- ============================================================
-- Migration 001: Initial Schema
-- CareCircle Healthcare Management Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('elderly', 'family', 'caretaker')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ELDERLY PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.elderly_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  medical_notes TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  preferred_timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_elderly_profiles_user_id UNIQUE (user_id)
);

-- ============================================================
-- CARE RELATIONSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.care_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  caregiver_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('family', 'caretaker')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_care_relationships UNIQUE (elderly_profile_id, caregiver_user_id)
);

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,  -- SHA-256 hash of the actual code
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('family', 'caretaker')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invitations_active UNIQUE (elderly_profile_id, invited_email, role),
  CONSTRAINT chk_expires_future CHECK (expires_at > created_at),
  CONSTRAINT chk_attempt_count CHECK (attempt_count >= 0 AND attempt_count <= 10)
);

-- ============================================================
-- MEDICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage_instructions TEXT NOT NULL,
  notes TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_medications_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_medicine_name_length CHECK (char_length(medicine_name) >= 1 AND char_length(medicine_name) <= 255),
  CONSTRAINT chk_dosage_instructions_length CHECK (char_length(dosage_instructions) >= 1)
);

-- ============================================================
-- MEDICATION SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_time TIME NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed', 'custom')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  days_of_week INTEGER[],  -- NULL = every day; array of 0-6 for specific days
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_days_of_week CHECK (
    days_of_week IS NULL OR
    (array_length(days_of_week, 1) > 0 AND
     NOT EXISTS (SELECT 1 FROM unnest(days_of_week) d WHERE d < 0 OR d > 6))
  )
);

-- ============================================================
-- DOSE EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dose_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'taken', 'skipped', 'missed', 'snoozed', 'unconfirmed')),
  acknowledged_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dose_events UNIQUE (medication_schedule_id, scheduled_for),
  CONSTRAINT chk_acknowledged_terminal CHECK (
    acknowledged_at IS NULL OR status IN ('taken', 'skipped', 'missed', 'snoozed')
  )
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  hospital_name TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_appointment_date_future CHECK (
    status = 'cancelled' OR appointment_date >= CURRENT_DATE - INTERVAL '1 day'
  ),
  CONSTRAINT chk_doctor_name_length CHECK (char_length(doctor_name) >= 1 AND char_length(doctor_name) <= 255)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'upcoming_medication', 'unconfirmed_medication', 'missed_medication',
    'upcoming_appointment', 'invitation', 'caregiver_intervention'
  )),
  related_event_id UUID,  -- polymorphic: points to dose_event, appointment, etc.
  related_event_type TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notifications_idempotent UNIQUE (recipient_user_id, notification_type, related_event_id),
  CONSTRAINT chk_retry_count CHECK (retry_count >= 0 AND retry_count <= 5)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
