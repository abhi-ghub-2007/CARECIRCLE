-- ============================================================
-- CARECIRCLE — DEVELOPMENT SEED DATA ONLY
-- DO NOT USE IN PRODUCTION
-- This file populates the database with realistic test fixtures
-- for local development and integration testing.
-- ============================================================

-- ============================================================
-- NOTE: These UUIDs are fixed placeholders for dev/test use.
-- In production, users are created via Supabase Auth signup.
-- You must first create these users in auth.users via the
-- Supabase dashboard or CLI before running this seed.
-- ============================================================

-- ----------------------------------------------------------------
-- USER UUIDs (placeholder — must exist in auth.users first)
-- ----------------------------------------------------------------
-- Elderly user 1:  00000000-0000-0000-0000-000000000001
-- Elderly user 2:  00000000-0000-0000-0000-000000000002
-- Family member 1: 00000000-0000-0000-0000-000000000003
-- Family member 2: 00000000-0000-0000-0000-000000000004
-- Caretaker 1:     00000000-0000-0000-0000-000000000005

-- ----------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------
INSERT INTO public.profiles (id, email, full_name, phone, role, avatar_url)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'dorothy.chen@example.com',  'Dorothy Chen',    '+1-555-0101', 'elderly',   NULL),
  ('00000000-0000-0000-0000-000000000002', 'george.miller@example.com', 'George Miller',   '+1-555-0102', 'elderly',   NULL),
  ('00000000-0000-0000-0000-000000000003', 'alice.chen@example.com',    'Alice Chen',      '+1-555-0103', 'family',    NULL),
  ('00000000-0000-0000-0000-000000000004', 'robert.miller@example.com', 'Robert Miller',   '+1-555-0104', 'family',    NULL),
  ('00000000-0000-0000-0000-000000000005', 'nurse.mary@example.com',    'Mary Thompson',   '+1-555-0105', 'caretaker', NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- ELDERLY PROFILES
-- ----------------------------------------------------------------
INSERT INTO public.elderly_profiles (id, user_id, date_of_birth, medical_notes, emergency_contact, emergency_phone, preferred_timezone)
VALUES
  (
    'aa000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '1945-03-14',
    'Type 2 diabetes, hypertension. Allergic to penicillin. No known food allergies.',
    'Alice Chen (daughter)',
    '+1-555-0103',
    'America/Los_Angeles'
  ),
  (
    'aa000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '1938-07-22',
    'Mild cognitive impairment, arthritis in both knees. Takes blood thinners.',
    'Robert Miller (son)',
    '+1-555-0104',
    'America/New_York'
  )
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------
-- CARE RELATIONSHIPS
-- ----------------------------------------------------------------
INSERT INTO public.care_relationships (id, elderly_profile_id, caregiver_user_id, relationship_type, permissions, status)
VALUES
  (
    'bb000000-0000-0000-0000-000000000001',
    'aa000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'family',
    ARRAY['view_medications','manage_medications','view_adherence','record_doses','view_appointments','manage_appointments'],
    'active'
  ),
  (
    'bb000000-0000-0000-0000-000000000002',
    'aa000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    'family',
    ARRAY['view_medications','view_adherence','view_appointments'],
    'active'
  ),
  (
    'bb000000-0000-0000-0000-000000000003',
    'aa000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000005',
    'caretaker',
    ARRAY['view_medications','manage_medications','view_adherence','record_doses','view_appointments'],
    'active'
  )
ON CONFLICT (elderly_profile_id, caregiver_user_id) DO NOTHING;

-- ----------------------------------------------------------------
-- MEDICATIONS — Dorothy Chen (elderly 1)
-- ----------------------------------------------------------------
INSERT INTO public.medications (id, elderly_profile_id, medicine_name, dosage_instructions, notes, start_date, end_date, status, created_by)
VALUES
  (
    'cc000000-0000-0000-0000-000000000001',
    'aa000000-0000-0000-0000-000000000001',
    'Metformin 500mg',
    'Take 1 tablet twice daily with meals. Do not crush or chew.',
    'For type 2 diabetes management. Monitor blood sugar weekly.',
    '2024-01-15',
    NULL,
    'active',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'cc000000-0000-0000-0000-000000000002',
    'aa000000-0000-0000-0000-000000000001',
    'Lisinopril 10mg',
    'Take 1 tablet once daily in the morning.',
    'For hypertension. Check blood pressure weekly. Report dizziness immediately.',
    '2024-02-01',
    NULL,
    'active',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'cc000000-0000-0000-0000-000000000003',
    'aa000000-0000-0000-0000-000000000001',
    'Vitamin D3 1000IU',
    'Take 1 softgel once daily with a meal.',
    'Supplement for bone health.',
    '2024-03-01',
    NULL,
    'active',
    '00000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- MEDICATIONS — George Miller (elderly 2)
-- ----------------------------------------------------------------
INSERT INTO public.medications (id, elderly_profile_id, medicine_name, dosage_instructions, notes, start_date, end_date, status, created_by)
VALUES
  (
    'cc000000-0000-0000-0000-000000000004',
    'aa000000-0000-0000-0000-000000000002',
    'Warfarin 5mg',
    'Take 1 tablet once daily at the same time each evening. Do NOT skip doses.',
    'Blood thinner — INR monitoring required monthly. Avoid green leafy vegetables in excess.',
    '2023-11-10',
    NULL,
    'active',
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    'cc000000-0000-0000-0000-000000000005',
    'aa000000-0000-0000-0000-000000000002',
    'Donepezil 5mg',
    'Take 1 tablet once daily at bedtime.',
    'For mild cognitive impairment. May cause vivid dreams.',
    '2024-04-01',
    NULL,
    'active',
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- MEDICATION SCHEDULES
-- ----------------------------------------------------------------
INSERT INTO public.medication_schedules (id, medication_id, scheduled_time, frequency, timezone, active, days_of_week)
VALUES
  -- Metformin: twice daily (morning + evening)
  ('dd000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', '08:00', 'twice_daily', 'America/Los_Angeles', TRUE, NULL),
  ('dd000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', '19:00', 'twice_daily', 'America/Los_Angeles', TRUE, NULL),
  -- Lisinopril: once daily morning
  ('dd000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000002', '09:00', 'daily',       'America/Los_Angeles', TRUE, NULL),
  -- Vitamin D3: once daily with lunch
  ('dd000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000003', '12:00', 'daily',       'America/Los_Angeles', TRUE, NULL),
  -- Warfarin: once daily evening
  ('dd000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000004', '20:00', 'daily',       'America/New_York',    TRUE, NULL),
  -- Donepezil: once daily at bedtime
  ('dd000000-0000-0000-0000-000000000006', 'cc000000-0000-0000-0000-000000000005', '22:00', 'daily',       'America/New_York',    TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- DOSE EVENTS — sample recent history (various statuses)
-- ----------------------------------------------------------------
INSERT INTO public.dose_events (id, medication_schedule_id, scheduled_for, status, acknowledged_at, recorded_by, notes)
VALUES
  -- Dorothy: Metformin morning — taken
  ('ee000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days' + INTERVAL '8 hours',  'taken',    NOW() - INTERVAL '2 days' + INTERVAL '8 hours 10 minutes', '00000000-0000-0000-0000-000000000001', NULL),
  -- Dorothy: Metformin evening — taken
  ('ee000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days' + INTERVAL '19 hours', 'taken',    NOW() - INTERVAL '2 days' + INTERVAL '19 hours 5 minutes', '00000000-0000-0000-0000-000000000001', NULL),
  -- Dorothy: Lisinopril yesterday morning — missed
  ('ee000000-0000-0000-0000-000000000003', 'dd000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day'  + INTERVAL '9 hours',  'missed',   NOW() - INTERVAL '1 day'  + INTERVAL '12 hours',           '00000000-0000-0000-0000-000000000003', 'Patient was asleep, caretaker marked missed'),
  -- Dorothy: Vitamin D3 — skipped
  ('ee000000-0000-0000-0000-000000000004', 'dd000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day'  + INTERVAL '12 hours', 'skipped',  NOW() - INTERVAL '1 day'  + INTERVAL '12 hours 30 minutes', '00000000-0000-0000-0000-000000000001', 'Felt nauseated, skipped vitamin'),
  -- Dorothy: Metformin today morning — unconfirmed (overdue)
  ('ee000000-0000-0000-0000-000000000005', 'dd000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours', 'unconfirmed', NULL, NULL, NULL),
  -- George: Warfarin — taken
  ('ee000000-0000-0000-0000-000000000006', 'dd000000-0000-0000-0000-000000000005', NOW() - INTERVAL '1 day'  + INTERVAL '20 hours', 'taken',    NOW() - INTERVAL '1 day'  + INTERVAL '20 hours 15 minutes', '00000000-0000-0000-0000-000000000002', NULL),
  -- George: Donepezil — snoozed
  ('ee000000-0000-0000-0000-000000000007', 'dd000000-0000-0000-0000-000000000006', NOW() - INTERVAL '1 day'  + INTERVAL '22 hours', 'snoozed',  NOW() - INTERVAL '1 day'  + INTERVAL '22 hours 5 minutes', '00000000-0000-0000-0000-000000000002', NULL),
  -- George: Warfarin today — upcoming
  ('ee000000-0000-0000-0000-000000000008', 'dd000000-0000-0000-0000-000000000005', NOW() + INTERVAL '4 hours', 'upcoming',   NULL, NULL, NULL)
ON CONFLICT (medication_schedule_id, scheduled_for) DO NOTHING;

-- ----------------------------------------------------------------
-- APPOINTMENTS
-- ----------------------------------------------------------------
INSERT INTO public.appointments (id, elderly_profile_id, doctor_name, hospital_name, appointment_date, appointment_time, timezone, purpose, notes, status, reminder_sent, created_by)
VALUES
  (
    'ff000000-0000-0000-0000-000000000001',
    'aa000000-0000-0000-0000-000000000001',
    'Dr. Sarah Wong',
    'Westside Medical Center',
    CURRENT_DATE + 7,
    '10:30',
    'America/Los_Angeles',
    'Quarterly diabetes check-up',
    'Bring blood sugar log. Fasting required 8 hours before.',
    'scheduled',
    FALSE,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'ff000000-0000-0000-0000-000000000002',
    'aa000000-0000-0000-0000-000000000001',
    'Dr. James Park',
    'Westside Eye Clinic',
    CURRENT_DATE + 14,
    '14:00',
    'America/Los_Angeles',
    'Annual eye examination',
    'Pupils may be dilated — arrange transportation home.',
    'scheduled',
    FALSE,
    '00000000-0000-0000-0000-000000000003'
  ),
  (
    'ff000000-0000-0000-0000-000000000003',
    'aa000000-0000-0000-0000-000000000002',
    'Dr. Patricia Lewis',
    'Eastside Neurology Associates',
    CURRENT_DATE + 3,
    '09:00',
    'America/New_York',
    'Cognitive assessment follow-up',
    'Bring list of current medications. Family member should accompany.',
    'scheduled',
    FALSE,
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- NOTIFICATIONS — sample pending/delivered
-- ----------------------------------------------------------------
INSERT INTO public.notifications (id, elderly_profile_id, recipient_user_id, notification_type, related_event_id, related_event_type, delivery_status, scheduled_at, delivered_at, retry_count)
VALUES
  (
    'gg000000-0000-0000-0000-000000000001',
    'aa000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'missed_medication',
    'ee000000-0000-0000-0000-000000000003',
    'dose_event',
    'delivered',
    NOW() - INTERVAL '1 day' + INTERVAL '13 hours',
    NOW() - INTERVAL '1 day' + INTERVAL '13 hours 1 minute',
    0
  ),
  (
    'gg000000-0000-0000-0000-000000000002',
    'aa000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'unconfirmed_medication',
    'ee000000-0000-0000-0000-000000000005',
    'dose_event',
    'pending',
    NOW() - INTERVAL '1 hour',
    NULL,
    0
  ),
  (
    'gg000000-0000-0000-0000-000000000003',
    'aa000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'upcoming_appointment',
    'ff000000-0000-0000-0000-000000000001',
    'appointment',
    'pending',
    NOW() + INTERVAL '6 days' + INTERVAL '10 hours',
    NULL,
    0
  )
ON CONFLICT (recipient_user_id, notification_type, related_event_id) DO NOTHING;
