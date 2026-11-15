-- ============================================================
-- Migration 003: Row Level Security Policies
-- CareCircle Healthcare Management Platform
-- ============================================================

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elderly_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions
-- ============================================================

-- Get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if the current user is an elderly user who owns a given elderly profile
CREATE OR REPLACE FUNCTION public.is_elderly_owner(p_elderly_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.elderly_profiles
    WHERE id = p_elderly_profile_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if the current user has an active care relationship with an elderly profile
CREATE OR REPLACE FUNCTION public.has_care_relationship(p_elderly_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.care_relationships
    WHERE elderly_profile_id = p_elderly_profile_id
      AND caregiver_user_id = auth.uid()
      AND status = 'active'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if the current user has a specific permission for an elderly profile
CREATE OR REPLACE FUNCTION public.has_permission(p_elderly_profile_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.care_relationships
    WHERE elderly_profile_id = p_elderly_profile_id
      AND caregiver_user_id = auth.uid()
      AND status = 'active'
      AND p_permission = ANY(permissions)
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES policies
-- ============================================================
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_care_related" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships cr
      JOIN public.elderly_profiles ep ON ep.id = cr.elderly_profile_id
      WHERE (cr.caregiver_user_id = auth.uid() AND ep.user_id = id)
        OR (ep.user_id = auth.uid() AND cr.caregiver_user_id = id)
        AND cr.status = 'active'
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- ELDERLY PROFILES policies
-- ============================================================
CREATE POLICY "elderly_profiles_select_own" ON public.elderly_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "elderly_profiles_select_caregiver" ON public.elderly_profiles
  FOR SELECT USING (public.has_care_relationship(id));

CREATE POLICY "elderly_profiles_insert_own" ON public.elderly_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "elderly_profiles_update_own" ON public.elderly_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- CARE RELATIONSHIPS policies
-- ============================================================
CREATE POLICY "care_relationships_select_elderly" ON public.care_relationships
  FOR SELECT USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "care_relationships_select_caregiver" ON public.care_relationships
  FOR SELECT USING (caregiver_user_id = auth.uid());

CREATE POLICY "care_relationships_insert_elderly" ON public.care_relationships
  FOR INSERT WITH CHECK (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "care_relationships_update_elderly" ON public.care_relationships
  FOR UPDATE USING (public.is_elderly_owner(elderly_profile_id));

-- ============================================================
-- INVITATIONS policies
-- ============================================================
CREATE POLICY "invitations_select_elderly" ON public.invitations
  FOR SELECT USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "invitations_insert_elderly" ON public.invitations
  FOR INSERT WITH CHECK (
    public.is_elderly_owner(elderly_profile_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "invitations_update_elderly" ON public.invitations
  FOR UPDATE USING (public.is_elderly_owner(elderly_profile_id));

-- Service role can read invitations (for accept-invitation edge function)
-- This is handled by using service_role in Edge Functions

-- ============================================================
-- MEDICATIONS policies
-- ============================================================
CREATE POLICY "medications_select_elderly" ON public.medications
  FOR SELECT USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "medications_select_caregiver" ON public.medications
  FOR SELECT USING (public.has_permission(elderly_profile_id, 'view_medications'));

CREATE POLICY "medications_insert_elderly" ON public.medications
  FOR INSERT WITH CHECK (
    public.is_elderly_owner(elderly_profile_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "medications_insert_caregiver" ON public.medications
  FOR INSERT WITH CHECK (
    public.has_permission(elderly_profile_id, 'manage_medications') AND
    created_by = auth.uid()
  );

CREATE POLICY "medications_update_elderly" ON public.medications
  FOR UPDATE USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "medications_update_caregiver" ON public.medications
  FOR UPDATE USING (public.has_permission(elderly_profile_id, 'manage_medications'));

-- ============================================================
-- MEDICATION SCHEDULES policies
-- ============================================================
CREATE POLICY "medication_schedules_select" ON public.medication_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.medications m
      WHERE m.id = medication_id AND (
        public.is_elderly_owner(m.elderly_profile_id) OR
        public.has_permission(m.elderly_profile_id, 'view_medications')
      )
    )
  );

CREATE POLICY "medication_schedules_insert" ON public.medication_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.medications m
      WHERE m.id = medication_id AND (
        public.is_elderly_owner(m.elderly_profile_id) OR
        public.has_permission(m.elderly_profile_id, 'manage_medications')
      )
    )
  );

CREATE POLICY "medication_schedules_update" ON public.medication_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.medications m
      WHERE m.id = medication_id AND (
        public.is_elderly_owner(m.elderly_profile_id) OR
        public.has_permission(m.elderly_profile_id, 'manage_medications')
      )
    )
  );

-- ============================================================
-- DOSE EVENTS policies
-- ============================================================
CREATE POLICY "dose_events_select" ON public.dose_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.medication_schedules ms
      JOIN public.medications m ON m.id = ms.medication_id
      WHERE ms.id = medication_schedule_id AND (
        public.is_elderly_owner(m.elderly_profile_id) OR
        public.has_permission(m.elderly_profile_id, 'view_adherence')
      )
    )
  );

CREATE POLICY "dose_events_insert" ON public.dose_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.medication_schedules ms
      JOIN public.medications m ON m.id = ms.medication_id
      WHERE ms.id = medication_schedule_id AND (
        public.is_elderly_owner(m.elderly_profile_id) OR
        public.has_permission(m.elderly_profile_id, 'record_doses')
      )
    )
  );

CREATE POLICY "dose_events_update" ON public.dose_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.medication_schedules ms
      JOIN public.medications m ON m.id = ms.medication_id
      WHERE ms.id = medication_schedule_id AND (
        public.is_elderly_owner(m.elderly_profile_id) OR
        public.has_permission(m.elderly_profile_id, 'record_doses')
      )
    )
  );

-- ============================================================
-- APPOINTMENTS policies
-- ============================================================
CREATE POLICY "appointments_select_elderly" ON public.appointments
  FOR SELECT USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "appointments_select_caregiver" ON public.appointments
  FOR SELECT USING (public.has_permission(elderly_profile_id, 'view_appointments'));

CREATE POLICY "appointments_insert_elderly" ON public.appointments
  FOR INSERT WITH CHECK (
    public.is_elderly_owner(elderly_profile_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "appointments_insert_caregiver" ON public.appointments
  FOR INSERT WITH CHECK (
    public.has_permission(elderly_profile_id, 'manage_appointments') AND
    created_by = auth.uid()
  );

CREATE POLICY "appointments_update_elderly" ON public.appointments
  FOR UPDATE USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "appointments_update_caregiver" ON public.appointments
  FOR UPDATE USING (public.has_permission(elderly_profile_id, 'manage_appointments'));

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================
CREATE POLICY "notifications_select_recipient" ON public.notifications
  FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY "notifications_select_elderly" ON public.notifications
  FOR SELECT USING (public.is_elderly_owner(elderly_profile_id));

CREATE POLICY "notifications_update_recipient" ON public.notifications
  FOR UPDATE USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- ============================================================
-- AUDIT LOGS policies (read-only for users)
-- ============================================================
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());
