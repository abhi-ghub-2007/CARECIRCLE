# CareCircle Supabase Edge Functions API Documentation

This document describes all Supabase Edge Functions for the CareCircle healthcare management platform.
All functions run on Deno/TypeScript in the Supabase Edge Runtime.

---

## 1. Architecture & Security Principles

- **Runtime**: Deno / TypeScript (Supabase Edge Runtime).
- **Authentication**: All client-facing endpoints require a valid Supabase Auth Bearer JWT token in the `Authorization` header (`Bearer <access_token>`).
- **Role Verification**: User roles (`elderly`, `family`, `caretaker`) and permissions are verified against the database (`public.profiles`, `public.elderly_profiles`, `public.care_relationships`) on every request. Client-supplied role claims in JWT or payloads are never trusted alone.
- **Service Role Operations**: Privileged and automated workflows (cron reminders, invitation lookups, background email sending) execute with the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS while enforcing strict internal validations.
- **Parameterized Queries**: All database interactions use the official `@supabase/supabase-js` client query builder, ensuring parameterized inputs and zero SQL injection vulnerability.
- **Input Validation**: Pure inline schema validation with strict type and boundary checking.
- **Audit Logging**: Sensitive and mutative operations trigger audit records in `public.audit_logs`.

---

## 2. Common Headers & Response Formats

### Standard Request Headers
```http
Authorization: Bearer <SUPABASE_JWT_TOKEN>
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

### Standard Response Shapes

#### Success Response (200 / 201)
```json
{
  "data": { ... }
}
```

#### Validation Error (422)
```json
{
  "error": "Validation failed",
  "errors": [
    "medicine_name is required",
    "scheduled_time must be a valid time in HH:MM format (24-hour)"
  ]
}
```

#### Error Response (400 / 401 / 403 / 404 / 429 / 500)
```json
{
  "error": "Descriptive error message"
}
```

---

## 3. Endpoints

### 3.1 Invitations

#### `POST /functions/v1/create-invitation`
Creates a secure, cryptographically generated invitation code for a family member or caretaker.

- **Auth Required**: Yes (`elderly` role only)
- **Rate Limit**: Maximum 5 invitations per elderly profile per hour

##### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `invited_email` | string | Yes | Email address of the invited caregiver |
| `role` | string | Yes | `'family'` or `'caretaker'` |
| `permissions` | string[] | No | Custom permissions array (defaults to role defaults if omitted) |

```json
{
  "invited_email": "jane.doe@example.com",
  "role": "family",
  "permissions": ["view_medications", "view_appointments", "view_adherence", "receive_notifications"]
}
```

##### Response (`201 Created`)
```json
{
  "data": {
    "invitation_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "code": "a8f5c9e2b0d744f19b88302fbc44e2193b2a8f5c9e2b0d744f19b88302fbc44e",
    "invited_email": "jane.doe@example.com",
    "role": "family",
    "expires_at": "2026-11-17T15:00:00.000Z"
  }
}
```

> **Security Note**: The 64-character plaintext code is returned **once**. The database stores only the SHA-256 hash `code_hash`.

---

#### `POST /functions/v1/accept-invitation`
Redeems an invitation code to establish a care circle relationship between caregiver and elderly user.

- **Auth Required**: Yes (authenticated caregiver user whose email matches the invitation)
- **Brute-Force Protection**: Max 10 attempts per invitation code hash before permanent invalidation.

##### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `elderly_profile_id` | UUID | Yes | Target elderly profile UUID |
| `code` | string | Yes | 64-hex invitation code received from elderly user |

```json
{
  "elderly_profile_id": "48b61e2a-1941-477c-a49e-b98a3b5a1cf1",
  "code": "a8f5c9e2b0d744f19b88302fbc44e2193b2a8f5c9e2b0d744f19b88302fbc44e"
}
```

##### Response (`200 OK`)
```json
{
  "data": {
    "message": "Successfully joined the care circle",
    "relationship": {
      "id": "77e1b6f0-d5a2-4a7b-a1e6-7bcf9509df14",
      "elderly_profile_id": "48b61e2a-1941-477c-a49e-b98a3b5a1cf1",
      "caregiver_user_id": "c1f7a408-0bf1-47b7-8a6c-7e61a8684bb2",
      "relationship_type": "family",
      "permissions": ["view_medications", "view_appointments", "view_adherence", "receive_notifications"],
      "status": "active"
    }
  }
}
```

---

### 3.2 Medication Management

#### `GET /functions/v1/manage-medication`
Fetches medications or schedules for an elderly profile.

- **Auth Required**: Yes (`elderly` owner or caregiver with `view_medications` permission)
- **Query Parameters**:
  - `elderly_profile_id` (UUID, optional if elderly caller)
  - `id` (UUID, optional: fetch specific medication with nested schedules)
  - `status` (`'active'` | `'inactive'` | `'completed'` | `'all'`, default `'active'`)
  - `medication_id` (UUID, used with `schedules_only=true`)
  - `schedules_only` (`boolean`, returns schedule list for `medication_id`)

##### Response (`200 OK`)
```json
{
  "data": {
    "medications": [
      {
        "id": "11111111-2222-3333-4444-555555555555",
        "elderly_profile_id": "48b61e2a-1941-477c-a49e-b98a3b5a1cf1",
        "medicine_name": "Lisinopril",
        "dosage_instructions": "10mg once daily in morning with water",
        "notes": "Take with breakfast",
        "start_date": "2026-01-01",
        "end_date": null,
        "status": "active",
        "medication_schedules": [
          {
            "id": "99999999-8888-7777-6666-555555555555",
            "medication_id": "11111111-2222-3333-4444-555555555555",
            "scheduled_time": "08:00:00",
            "frequency": "daily",
            "timezone": "America/New_York",
            "active": true,
            "days_of_week": null
          }
        ]
      }
    ]
  }
}
```

---

#### `POST /functions/v1/manage-medication`
Creates a medication or a medication schedule.

- **Auth Required**: Yes (`elderly` owner or caregiver with `manage_medications` permission)

##### Create Medication Body
```json
{
  "elderly_profile_id": "48b61e2a-1941-477c-a49e-b98a3b5a1cf1",
  "medicine_name": "Metformin",
  "dosage_instructions": "500mg twice daily with meals",
  "notes": "Monitor blood glucose",
  "start_date": "2026-11-15",
  "end_date": "2027-11-15",
  "schedules": [
    {
      "scheduled_time": "08:30",
      "frequency": "daily",
      "timezone": "America/New_York"
    },
    {
      "scheduled_time": "19:00",
      "frequency": "daily",
      "timezone": "America/New_York"
    }
  ]
}
```

##### Create Schedule Sub-Action Body
```json
{
  "action": "create_schedule",
  "medication_id": "11111111-2222-3333-4444-555555555555",
  "scheduled_time": "14:00",
  "frequency": "daily",
  "timezone": "America/New_York",
  "days_of_week": [1, 3, 5]
}
```

##### Response (`201 Created`)
```json
{
  "data": {
    "medication": {
      "id": "11111111-2222-3333-4444-555555555555",
      "medicine_name": "Metformin",
      "status": "active"
    }
  }
}
```

---

#### `PUT /functions/v1/manage-medication`
Updates an existing medication or schedule.

- **Auth Required**: Yes (`elderly` owner or caregiver with `manage_medications` permission)

##### Update Medication Body
```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "dosage_instructions": "1000mg twice daily with meals",
  "notes": "Updated by Dr. Smith"
}
```

##### Update Schedule Body
```json
{
  "action": "update_schedule",
  "id": "99999999-8888-7777-6666-555555555555",
  "scheduled_time": "09:00",
  "active": true
}
```

---

#### `DELETE /functions/v1/manage-medication?id=<medication_id>` (or `PATCH`)
Soft-deletes a medication (sets `status = 'inactive'` and deactivates linked schedules).

- **Auth Required**: Yes (`elderly` owner or caregiver with `manage_medications` permission)

##### Response (`200 OK`)
```json
{
  "data": {
    "message": "Medication deactivated successfully",
    "medication": {
      "id": "11111111-2222-3333-4444-555555555555",
      "status": "inactive"
    }
  }
}
```

---

### 3.3 Dose Logging & Adherence

#### `GET /functions/v1/record-dose`
Retrieves logged dose events.

- **Auth Required**: Yes (`elderly` owner or caregiver with `view_adherence` / `view_medications` / `record_doses`)
- **Query Parameters**:
  - `medication_schedule_id` (UUID, optional)
  - `elderly_profile_id` (UUID, optional if elderly caller)
  - `date_from` (ISO string, optional)
  - `date_to` (ISO string, optional)
  - `status` (optional: `'taken'` | `'skipped'` | `'snoozed'` | `'missed'` | `'upcoming'` | `'unconfirmed'`)

##### Response (`200 OK`)
```json
{
  "data": {
    "dose_events": [
      {
        "id": "a4d80a1e-cf61-464a-bf3b-a25eefeaec33",
        "medication_schedule_id": "99999999-8888-7777-6666-555555555555",
        "scheduled_for": "2026-11-15T08:00:00.000Z",
        "status": "taken",
        "acknowledged_at": "2026-11-15T08:10:00.000Z",
        "recorded_by": "c1f7a408-0bf1-47b7-8a6c-7e61a8684bb2",
        "notes": "Taken with a glass of water"
      }
    ]
  }
}
```

---

#### `POST /functions/v1/record-dose`
Records or updates the status of a scheduled dose.

- **Auth Required**: Yes (`elderly` owner or caregiver with `record_doses` permission)
- **Constraint**: Upserts based on unique `(medication_schedule_id, scheduled_for)`.

##### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `medication_schedule_id` | UUID | Yes | Target schedule ID |
| `scheduled_for` | ISO string | Yes | Date and time the dose was scheduled for |
| `status` | string | Yes | `'taken'`, `'skipped'`, `'snoozed'`, `'missed'`, or `'unconfirmed'` |
| `notes` | string | No | Optional notes |
| `snoozed_until` | ISO string | If status='snoozed' | Future timestamp when snooze ends |

```json
{
  "medication_schedule_id": "99999999-8888-7777-6666-555555555555",
  "scheduled_for": "2026-11-15T08:00:00.000Z",
  "status": "taken",
  "notes": "Observed taking pill"
}
```

##### Response (`200 OK`)
```json
{
  "data": {
    "dose_event": {
      "id": "a4d80a1e-cf61-464a-bf3b-a25eefeaec33",
      "medication_schedule_id": "99999999-8888-7777-6666-555555555555",
      "scheduled_for": "2026-11-15T08:00:00.000Z",
      "status": "taken",
      "acknowledged_at": "2026-11-15T15:18:00.000Z",
      "recorded_by": "user-uuid"
    }
  }
}
```

---

### 3.4 Appointments Management

#### `GET /functions/v1/manage-appointment`
Lists appointments for an elderly profile or gets a single appointment.

- **Auth Required**: Yes (`elderly` owner or caregiver with `view_appointments` permission)
- **Query Parameters**:
  - `id` (UUID, single appointment lookup)
  - `elderly_profile_id` (UUID, optional if elderly caller)
  - `status` (`'scheduled'` | `'completed'` | `'cancelled'` | `'all'`)
  - `date_from` (YYYY-MM-DD)
  - `date_to` (YYYY-MM-DD)

---

#### `POST /functions/v1/manage-appointment`
Creates a medical appointment.

- **Auth Required**: Yes (`elderly` owner or caregiver with `manage_appointments` permission)

##### Request Body
```json
{
  "elderly_profile_id": "48b61e2a-1941-477c-a49e-b98a3b5a1cf1",
  "doctor_name": "Dr. Sarah Chen, MD",
  "hospital_name": "Metro General Hospital",
  "appointment_date": "2026-11-20",
  "appointment_time": "10:30",
  "timezone": "America/New_York",
  "purpose": "Quarterly cardiology follow-up",
  "notes": "Bring recent blood pressure logs"
}
```

##### Response (`201 Created`)
```json
{
  "data": {
    "appointment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_name": "Dr. Sarah Chen, MD",
      "appointment_date": "2026-11-20",
      "appointment_time": "10:30:00",
      "status": "scheduled",
      "reminder_sent": false
    }
  }
}
```

---

#### `PUT /functions/v1/manage-appointment`
Updates an existing appointment.

- **Auth Required**: Yes (`elderly` owner or caregiver with `manage_appointments` permission)

##### Request Body
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_time": "11:00",
  "notes": "Time moved by clinic"
}
```

---

#### `PATCH /functions/v1/manage-appointment`
Cancels an appointment (sets `status = 'cancelled'`).

- **Auth Required**: Yes (`elderly` owner or caregiver with `manage_appointments` permission)

##### Request Body (or query param `?id=...`)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 3.5 Automated Cron Jobs & Notifications

#### `POST /functions/v1/process-reminders`
Executed periodically (e.g., every 5-15 minutes) via Supabase Cron.

- **Auth Required**: Service Role Key (`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`)
- **Operations**:
  1. Checks active medications scheduled within 30 minutes.
  2. Creates upcoming medication reminders for elderly user and authorized caregivers.
  3. Checks scheduled appointments for tomorrow and dispatches advance notices.

##### Response (`200 OK`)
```json
{
  "data": {
    "summary": {
      "medication_reminders_checked": 12,
      "medication_notifications_sent": 8,
      "appointment_reminders_checked": 3,
      "appointment_notifications_sent": 3,
      "errors": []
    }
  }
}
```

---

#### `POST /functions/v1/process-missed-doses`
Executed periodically via Supabase Cron.

- **Auth Required**: Service Role Key (`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`)
- **Operations**:
  1. Identifies doses where `status IN ('upcoming', 'due')` and `scheduled_for < NOW() - 30 minutes`.
  2. Updates status to `'missed'` with `acknowledged_at = NOW()`.
  3. Generates idempotent `'missed_medication'` notification records.
  4. Triggers immediate email dispatch via Resend.

##### Response (`200 OK`)
```json
{
  "data": {
    "summary": {
      "missed_doses_marked": 2,
      "notifications_dispatched": 4,
      "errors": []
    }
  }
}
```

---

#### `POST /functions/v1/send-notification`
Handles transactional email dispatch via Resend API.

- **Auth Required**: Service Role Key (`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`)
- **Delivery Modes**:
  - `NOTIFICATION_MODE=development` or no `RESEND_API_KEY`: logs email payload to console and marks `delivered_at = NOW()`.
  - `NOTIFICATION_MODE=production`: dispatches via Resend REST API, supports retry tracking up to 5 attempts.

##### Request Body
```json
{
  "notification_id": "3b2e5359-7153-4318-80f0-c650ee40939c"
}
```

---

## 4. Environment Variables Reference

| Variable | Description | Where Configured |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Supabase Runtime / .env |
| `SUPABASE_ANON_KEY` | Public anonymous client key | Supabase Runtime / .env |
| `SUPABASE_SERVICE_ROLE_KEY` | High-privilege service key | Supabase Secrets / .env |
| `RESEND_API_KEY` | Resend transactional email API key | Supabase Secrets |
| `APP_URL` | Frontend URL for email deep-links (e.g. `http://localhost:5173`) | Supabase Secrets / .env |
| `NOTIFICATION_MODE` | `'development'` or `'production'` | Supabase Secrets / .env |
