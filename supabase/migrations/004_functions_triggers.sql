-- ============================================================
-- Migration 004: Functions and Triggers
-- CareCircle Healthcare Management Platform
-- ============================================================

-- ============================================================
-- Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_elderly_profiles_updated_at
  BEFORE UPDATE ON public.elderly_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_care_relationships_updated_at
  BEFORE UPDATE ON public.care_relationships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_dose_events_updated_at
  BEFORE UPDATE ON public.dose_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'elderly')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Auto-create elderly_profile for elderly role users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_elderly_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'elderly' THEN
    INSERT INTO public.elderly_profiles (user_id, preferred_timezone)
    VALUES (NEW.id, 'UTC')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_elderly_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_elderly_profile_creation();

-- ============================================================
-- Prevent consuming an expired or already-consumed invitation
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_invitation_consumption()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has already been consumed';
  END IF;
  IF OLD.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_invitation_consumption
  BEFORE UPDATE OF consumed_at ON public.invitations
  FOR EACH ROW
  WHEN (NEW.consumed_at IS NOT NULL AND OLD.consumed_at IS NULL)
  EXECUTE FUNCTION public.validate_invitation_consumption();

-- ============================================================
-- Prevent duplicate active invitations
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_active_invitation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE elderly_profile_id = NEW.elderly_profile_id
      AND invited_email = NEW.invited_email
      AND consumed_at IS NULL
      AND expires_at > NOW()
      AND id != COALESCE(NEW.id, uuid_generate_v4())
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_active_invitation
  BEFORE INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.check_active_invitation();

-- ============================================================
-- Audit logging function
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
