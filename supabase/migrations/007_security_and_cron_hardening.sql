-- ============================================================
-- Migration 007: Security hardening and reliable scheduled jobs
-- Apply after migrations 001-006.
-- ============================================================

-- Fix boolean precedence: an inactive relationship must never expose profiles.
DROP POLICY IF EXISTS "profiles_select_care_related" ON public.profiles;
CREATE POLICY "profiles_select_care_related" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      JOIN public.elderly_profiles ep ON ep.id = cr.elderly_profile_id
      WHERE cr.status = 'active'
        AND (
          (cr.caregiver_user_id = auth.uid() AND ep.user_id = id)
          OR
          (ep.user_id = auth.uid() AND cr.caregiver_user_id = id)
        )
    )
  );

-- A signed-in user may update their own display information, but must never
-- self-assign a different application role. Service-role backend operations
-- may still change a role when required by a trusted workflow.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Application role cannot be changed by the account owner'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- Make the invitation lookup unambiguous. Tokens have 256 bits of entropy.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_code_hash
  ON public.invitations(code_hash);

-- A recipient can mark a notification as read, but cannot rewrite the
-- notification's recipient, event, type or delivery state.
CREATE OR REPLACE FUNCTION public.protect_notification_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    IF NEW.elderly_profile_id IS DISTINCT FROM OLD.elderly_profile_id
       OR NEW.recipient_user_id IS DISTINCT FROM OLD.recipient_user_id
       OR NEW.notification_type IS DISTINCT FROM OLD.notification_type
       OR NEW.related_event_id IS DISTINCT FROM OLD.related_event_id
       OR NEW.related_event_type IS DISTINCT FROM OLD.related_event_type
       OR NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
       OR NEW.retry_count IS DISTINCT FROM OLD.retry_count
       OR NEW.last_error IS DISTINCT FROM OLD.last_error THEN
      RAISE EXCEPTION 'Notification delivery fields are read-only'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_notification_fields ON public.notifications;
CREATE TRIGGER trg_protect_notification_fields
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_fields();

-- Supabase Cron must use Vault secrets, not undefined custom PostgreSQL settings.
-- Configure secrets named carecircle_project_url and carecircle_service_role_key
-- in Supabase Vault before enabling these jobs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    PERFORM cron.unschedule('process-medication-reminders');
    PERFORM cron.unschedule('process-missed-doses');
    PERFORM cron.unschedule('process-appointment-reminders');

    PERFORM cron.schedule(
      'process-medication-reminders',
      '*/15 * * * *',
      $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'carecircle_project_url' LIMIT 1)
                 || '/functions/v1/process-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' ||
              (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'carecircle_service_role_key' LIMIT 1)
          ),
          body := '{"type":"medication_reminder"}'::jsonb
        );
      $job$
    );

    PERFORM cron.schedule(
      'process-missed-doses',
      '*/30 * * * *',
      $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'carecircle_project_url' LIMIT 1)
                 || '/functions/v1/process-missed-doses',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' ||
              (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'carecircle_service_role_key' LIMIT 1)
          ),
          body := '{"type":"missed_dose_check"}'::jsonb
        );
      $job$
    );

    PERFORM cron.schedule(
      'process-appointment-reminders',
      '0 8 * * *',
      $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'carecircle_project_url' LIMIT 1)
                 || '/functions/v1/process-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' ||
              (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'carecircle_service_role_key' LIMIT 1)
          ),
          body := '{"type":"appointment_reminder"}'::jsonb
        );
      $job$
    );
  ELSE
    RAISE NOTICE 'Cron/Vault extensions unavailable. Configure scheduled functions manually in Supabase Dashboard.';
  END IF;
END $$;
