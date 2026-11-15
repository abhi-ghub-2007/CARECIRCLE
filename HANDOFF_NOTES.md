# CareCircle handoff notes

This package is a cleaned source snapshot with targeted repairs made during review.

## Repairs made
- Wrapped the React application in `AuthProvider`; the original entry point did not provide the auth context required by pages.
- Added authenticated nested routes and the missing `/accept-invitation` route.
- Replaced the placeholder caregiver dashboard with a real accessible-profile selector and navigation to medication, appointment, and care-circle workflows.
- Removed fake-success invitation fallbacks. An offline/failed invitation request now displays an error instead of showing a fabricated code or claiming that an invitation was accepted.
- Fixed invitation acceptance so the backend derives the elderly profile from the hashed invitation token instead of requiring a profile UUID that the UI never supplied.
- Made invitation consumption conditional and checked the returned row to reduce replay/race issues.
- Added `manage_appointments` to the server-side invitation permission allowlist.
- Corrected notification read state to update `read_at` rather than falsely changing email delivery state.
- Tightened cron/send-notification authorization to exact service-role bearer-token comparison.
- Added migration `007_security_and_cron_hardening.sql` for a profile-policy precedence fix, role-change protection, notification-field protection, unique invitation hashes, and Vault-based Cron configuration.
- Added `.env.example` and setup/deployment instructions.

## Not verified
This environment could not run the original uploaded Windows `node_modules` on Linux. The native Vite/Vitest/TypeScript platform bindings in the archive were not compatible with this runtime. Therefore no claim is made that the modified project currently passes build, lint, unit, integration, E2E, database migration, or deployment checks.

On the target Windows machine, delete the old `node_modules` folder and run `npm ci`, then run:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Apply migrations to a fresh Supabase project and test using separate accounts for elderly, family, caretaker, and an unrelated user.

## Important deployment configuration
- Copy `.env.example` to `.env.local`.
- Never put the Supabase service-role key in any `VITE_` variable.
- Configure Supabase Edge Function secrets as documented in `README.md`.
- Enable/configure Vault, `pg_cron`, and `pg_net` before relying on scheduled email reminders.
- Set `NOTIFICATION_MODE=production` and a verified `RESEND_FROM_EMAIL` only after verifying the sender domain with Resend.
- Test real email delivery and cron execution from Supabase logs.

## Safety
Use synthetic demo data only. CareCircle is not a diagnostic or prescribing system. It must not recommend extra doses or change medication instructions.
