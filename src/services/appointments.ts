import { supabase } from '@/lib/supabase'
import type { Appointment, AppointmentStatus } from '@/types'

export async function getAppointments(
  elderlyProfileId: string,
  status?: AppointmentStatus
): Promise<Appointment[]> {
  let query = supabase
    .from('appointments')
    .select('*')
    .eq('elderly_profile_id', elderlyProfileId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as Appointment[]
}

export async function getUpcomingAppointments(
  elderlyProfileId: string,
  limit: number = 3
): Promise<Appointment[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('elderly_profile_id', elderlyProfileId)
    .eq('status', 'scheduled')
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as Appointment[]
}

export async function createAppointment(
  appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Appointment
}

export async function updateAppointment(
  id: string,
  updates: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Appointment
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  return updateAppointment(id, { status: 'cancelled' })
}
