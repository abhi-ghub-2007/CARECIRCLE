-- ============================================================
-- Migration 005: Cron Jobs
-- CareCircle Healthcare Management Platform
-- Uses pg_cron + pg_net (available in Supabase)
-- ============================================================

-- Process upcoming medication reminders every 15 minutes
SELECT cron.schedule(
  'process-medication-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('type', 'medication_reminder')
  );
  $$
);

-- Process missed dose detection every 30 minutes
SELECT cron.schedule(
  'process-missed-doses',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/process-missed-doses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('type', 'missed_dose_check')
  );
  $$
);

-- Process upcoming appointment reminders daily at 8 AM UTC
SELECT cron.schedule(
  'process-appointment-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('type', 'appointment_reminder')
  );
  $$
);
