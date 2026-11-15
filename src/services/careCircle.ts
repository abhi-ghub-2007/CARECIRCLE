import { supabase } from '@/lib/supabase'
import type { CareRelationship, Profile, ElderlyProfile } from '@/types'

export interface CaregiverWithProfile extends CareRelationship {
  caregiver?: Profile
}

export interface ElderlyWithDetails extends ElderlyProfile {
  profile?: Profile
  care_relationship_id?: string
  relationship_type?: 'family' | 'caretaker'
  permissions?: string[]
}

export interface InvitationRecord {
  id: string
  elderly_profile_id: string
  invited_email: string
  role: 'family' | 'caretaker'
  token?: string
  expires_at: string
  consumed_at?: string | null
  created_at: string
}

export async function getCareRelationships(elderlyProfileId: string): Promise<CaregiverWithProfile[]> {
  const { data, error } = await supabase
    .from('care_relationships')
    .select(`
      *,
      caregiver:profiles!caregiver_user_id (*)
    `)
    .eq('elderly_profile_id', elderlyProfileId)
    .eq('status', 'active')

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as unknown as CaregiverWithProfile[]
}

export async function getAccessibleElderlyProfiles(caregiverUserId: string): Promise<ElderlyWithDetails[]> {
  const { data, error } = await supabase
    .from('care_relationships')
    .select(`
      id,
      relationship_type,
      permissions,
      elderly_profile:elderly_profiles!inner (
        *,
        profile:profiles!inner (*)
      )
    `)
    .eq('caregiver_user_id', caregiverUserId)
    .eq('status', 'active')

  if (error) {
    throw new Error(error.message)
  }

  return ((data || []) as Array<{
    id: string
    relationship_type: 'family' | 'caretaker'
    permissions: string[]
    elderly_profile: ElderlyProfile & { profile: Profile }
  }>).map((rel) => ({
    ...rel.elderly_profile,
    care_relationship_id: rel.id,
    relationship_type: rel.relationship_type,
    permissions: rel.permissions,
  }))
}

export async function getActiveInvitations(elderlyProfileId: string): Promise<InvitationRecord[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('elderly_profile_id', elderlyProfileId)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as InvitationRecord[]
}

export async function revokeCareRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from('care_relationships')
    .update({ status: 'revoked' })
    .eq('id', relationshipId)

  if (error) {
    throw new Error(error.message)
  }
}
