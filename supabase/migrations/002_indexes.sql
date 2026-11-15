-- ============================================================
-- Migration 002: Performance Indexes
-- CareCircle Healthcare Management Platform
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Elderly profiles
CREATE INDEX idx_elderly_profiles_user_id ON public.elderly_profiles(user_id);

-- Care relationships
CREATE INDEX idx_care_relationships_elderly ON public.care_relationships(elderly_profile_id);
CREATE INDEX idx_care_relationships_caregiver ON public.care_relationships(caregiver_user_id);
CREATE INDEX idx_care_relationships_status ON public.care_relationships(status);

-- Invitations
CREATE INDEX idx_invitations_elderly ON public.invitations(elderly_profile_id);
CREATE INDEX idx_invitations_email ON public.invitations(invited_email);
CREATE INDEX idx_invitations_expires ON public.invitations(expires_at) WHERE consumed_at IS NULL;

-- Medications
CREATE INDEX idx_medications_elderly ON public.medications(elderly_profile_id);
CREATE INDEX idx_medications_status ON public.medications(status);
CREATE INDEX idx_medications_elderly_status ON public.medications(elderly_profile_id, status);

-- Medication schedules
CREATE INDEX idx_medication_schedules_medication ON public.medication_schedules(medication_id);
CREATE INDEX idx_medication_schedules_active ON public.medication_schedules(active);

-- Dose events
CREATE INDEX idx_dose_events_schedule ON public.dose_events(medication_schedule_id);
CREATE INDEX idx_dose_events_scheduled_for ON public.dose_events(scheduled_for);
CREATE INDEX idx_dose_events_status ON public.dose_events(status);
CREATE INDEX idx_dose_events_unconfirmed ON public.dose_events(scheduled_for) WHERE status = 'unconfirmed';
CREATE INDEX idx_dose_events_missed ON public.dose_events(scheduled_for) WHERE status IN ('missed', 'unconfirmed');

-- Appointments
CREATE INDEX idx_appointments_elderly ON public.appointments(elderly_profile_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_upcoming ON public.appointments(appointment_date, appointment_time) WHERE status = 'scheduled';

-- Notifications
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_elderly ON public.notifications(elderly_profile_id);
CREATE INDEX idx_notifications_status ON public.notifications(delivery_status);
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_at) WHERE delivery_status = 'pending';
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_user_id) WHERE read_at IS NULL;

-- Audit logs
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
