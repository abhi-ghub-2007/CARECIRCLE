// ============================================================
// CareCircle — Application Types
// ============================================================

export type UserRole = 'elderly' | 'family' | 'caretaker'

export type DoseStatus = 'upcoming' | 'due' | 'taken' | 'skipped' | 'missed' | 'snoozed' | 'unconfirmed'

export type MedicationStatus = 'active' | 'inactive' | 'completed'

export type MedicationFrequency = 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'as_needed' | 'custom'

export type RelationshipStatus = 'active' | 'revoked' | 'pending'

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

export type NotificationType =
  | 'upcoming_medication'
  | 'unconfirmed_medication'
  | 'missed_medication'
  | 'upcoming_appointment'
  | 'invitation'
  | 'caregiver_intervention'

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped'

export type Permission =
  | 'view_medications'
  | 'manage_medications'
  | 'view_appointments'
  | 'manage_appointments'
  | 'record_doses'
  | 'view_adherence'
  | 'receive_notifications'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface ElderlyProfile {
  id: string
  user_id: string
  date_of_birth?: string
  medical_notes?: string
  emergency_contact?: string
  emergency_phone?: string
  preferred_timezone: string
  created_at: string
  updated_at: string
}

export interface CareRelationship {
  id: string
  elderly_profile_id: string
  caregiver_user_id: string
  relationship_type: 'family' | 'caretaker'
  permissions: Permission[]
  status: RelationshipStatus
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  elderly_profile_id: string
  invited_email: string
  role: 'family' | 'caretaker'
  expires_at: string
  consumed_at?: string
  created_by: string
  created_at: string
}

export interface Medication {
  id: string
  elderly_profile_id: string
  medicine_name: string
  dosage_instructions: string
  notes?: string
  start_date: string
  end_date?: string
  status: MedicationStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface MedicationSchedule {
  id: string
  medication_id: string
  scheduled_time: string
  frequency: MedicationFrequency
  timezone: string
  active: boolean
  days_of_week?: number[]
  created_at: string
}

export interface DoseEvent {
  id: string
  medication_schedule_id: string
  scheduled_for: string
  status: DoseStatus
  acknowledged_at?: string
  recorded_by?: string
  notes?: string
  created_at: string
}

export interface Appointment {
  id: string
  elderly_profile_id: string
  doctor_name: string
  hospital_name?: string
  appointment_date: string
  appointment_time: string
  timezone: string
  purpose?: string
  notes?: string
  status: AppointmentStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  elderly_profile_id: string
  recipient_user_id: string
  notification_type: NotificationType
  related_event_id?: string
  delivery_status: DeliveryStatus
  scheduled_at: string
  delivered_at?: string
  retry_count: number
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  metadata?: Record<string, unknown>
  created_at: string
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// Adherence summary (computed)
export interface AdherenceSummary {
  elderly_profile_id: string
  period_start: string
  period_end: string
  total_scheduled: number
  taken: number
  skipped: number
  missed: number
  unconfirmed: number
  adherence_percentage: number
}

// Parsed medication schedule (for AI NLP feature)
export interface ParsedSchedule {
  frequency: MedicationFrequency
  times: string[]
  instructions?: string
  confidence: number
}
