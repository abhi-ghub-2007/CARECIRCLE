// ============================================================
// CareCircle — Supabase Database Types
// Auto-generated style — mirrors the DB schema exactly
// ============================================================

import type {
  UserRole,
  DoseStatus,
  MedicationStatus,
  MedicationFrequency,
  RelationshipStatus,
  AppointmentStatus,
  NotificationType,
  DeliveryStatus,
  Permission,
} from './index'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          avatar_url?: string | null
          updated_at?: string
        }
      }
      elderly_profiles: {
        Row: {
          id: string
          user_id: string
          date_of_birth: string | null
          medical_notes: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          preferred_timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date_of_birth?: string | null
          medical_notes?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          preferred_timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          date_of_birth?: string | null
          medical_notes?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          preferred_timezone?: string
          updated_at?: string
        }
      }
      care_relationships: {
        Row: {
          id: string
          elderly_profile_id: string
          caregiver_user_id: string
          relationship_type: 'family' | 'caretaker'
          permissions: Permission[]
          status: RelationshipStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          elderly_profile_id: string
          caregiver_user_id: string
          relationship_type: 'family' | 'caretaker'
          permissions?: Permission[]
          status?: RelationshipStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          permissions?: Permission[]
          status?: RelationshipStatus
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          elderly_profile_id: string
          invited_email: string
          role: 'family' | 'caretaker'
          token: string
          expires_at: string
          consumed_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          elderly_profile_id: string
          invited_email: string
          role: 'family' | 'caretaker'
          token: string
          expires_at: string
          consumed_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          consumed_at?: string | null
        }
      }
      medications: {
        Row: {
          id: string
          elderly_profile_id: string
          medicine_name: string
          dosage_instructions: string
          notes: string | null
          start_date: string
          end_date: string | null
          status: MedicationStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          elderly_profile_id: string
          medicine_name: string
          dosage_instructions: string
          notes?: string | null
          start_date: string
          end_date?: string | null
          status?: MedicationStatus
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          medicine_name?: string
          dosage_instructions?: string
          notes?: string | null
          end_date?: string | null
          status?: MedicationStatus
          updated_at?: string
        }
      }
      medication_schedules: {
        Row: {
          id: string
          medication_id: string
          scheduled_time: string
          frequency: MedicationFrequency
          timezone: string
          active: boolean
          days_of_week: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          scheduled_time: string
          frequency: MedicationFrequency
          timezone?: string
          active?: boolean
          days_of_week?: number[] | null
          created_at?: string
        }
        Update: {
          scheduled_time?: string
          frequency?: MedicationFrequency
          timezone?: string
          active?: boolean
          days_of_week?: number[] | null
        }
      }
      dose_events: {
        Row: {
          id: string
          medication_schedule_id: string
          scheduled_for: string
          status: DoseStatus
          acknowledged_at: string | null
          recorded_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_schedule_id: string
          scheduled_for: string
          status?: DoseStatus
          acknowledged_at?: string | null
          recorded_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          status?: DoseStatus
          acknowledged_at?: string | null
          recorded_by?: string | null
          notes?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          elderly_profile_id: string
          doctor_name: string
          hospital_name: string | null
          appointment_date: string
          appointment_time: string
          timezone: string
          purpose: string | null
          notes: string | null
          status: AppointmentStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          elderly_profile_id: string
          doctor_name: string
          hospital_name?: string | null
          appointment_date: string
          appointment_time: string
          timezone?: string
          purpose?: string | null
          notes?: string | null
          status?: AppointmentStatus
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          doctor_name?: string
          hospital_name?: string | null
          appointment_date?: string
          appointment_time?: string
          timezone?: string
          purpose?: string | null
          notes?: string | null
          status?: AppointmentStatus
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          elderly_profile_id: string
          recipient_user_id: string
          notification_type: NotificationType
          related_event_id: string | null
          delivery_status: DeliveryStatus
          scheduled_at: string
          delivered_at: string | null
          retry_count: number
          created_at: string
        }
        Insert: {
          id?: string
          elderly_profile_id: string
          recipient_user_id: string
          notification_type: NotificationType
          related_event_id?: string | null
          delivery_status?: DeliveryStatus
          scheduled_at: string
          delivered_at?: string | null
          retry_count?: number
          created_at?: string
        }
        Update: {
          delivery_status?: DeliveryStatus
          delivered_at?: string | null
          retry_count?: number
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
