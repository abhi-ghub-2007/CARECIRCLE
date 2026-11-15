import { supabase } from '@/lib/supabase'
import type {
  Medication,
  MedicationSchedule,
  DoseEvent,
  AdherenceSummary,
  DoseStatus,
  MedicationFrequency,
} from '@/types'

export interface MedicationWithSchedules extends Medication {
  medication_schedules?: MedicationSchedule[]
}

export interface DoseEventWithDetails extends DoseEvent {
  medication_schedule?: {
    id: string
    scheduled_time: string
    frequency: MedicationFrequency
    medication: {
      id: string
      medicine_name: string
      dosage_instructions: string
      notes: string | null
    }
  }
}

export async function getMedications(elderlyProfileId: string): Promise<MedicationWithSchedules[]> {
  const { data, error } = await supabase
    .from('medications')
    .select(`
      *,
      medication_schedules (*)
    `)
    .eq('elderly_profile_id', elderlyProfileId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as unknown as MedicationWithSchedules[]
}

export async function getMedicationSchedules(medicationId: string): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('medication_id', medicationId)
    .eq('active', true)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as MedicationSchedule[]
}

export async function getDoseEvents(scheduleId: string, date?: string): Promise<DoseEvent[]> {
  let query = supabase
    .from('dose_events')
    .select('*')
    .eq('medication_schedule_id', scheduleId)

  if (date) {
    const startOfDay = `${date}T00:00:00.000Z`
    const endOfDay = `${date}T23:59:59.999Z`
    query = query.gte('scheduled_for', startOfDay).lte('scheduled_for', endOfDay)
  }

  const { data, error } = await query.order('scheduled_for', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as DoseEvent[]
}

export async function getTodayDoseEvents(elderlyProfileId: string): Promise<DoseEventWithDetails[]> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  // Join dose_events through medication_schedules to medications with elderly_profile_id
  const { data, error } = await supabase
    .from('dose_events')
    .select(`
      *,
      medication_schedule:medication_schedules (
        id,
        scheduled_time,
        frequency,
        medication:medications!inner (
          id,
          medicine_name,
          dosage_instructions,
          notes,
          elderly_profile_id
        )
      )
    `)
    .eq('medication_schedule.medication.elderly_profile_id', elderlyProfileId)
    .gte('scheduled_for', startOfDay)
    .lte('scheduled_for', endOfDay)
    .order('scheduled_for', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as unknown as DoseEventWithDetails[]
}

export async function recordDose(
  doseEventId: string,
  status: DoseStatus,
  notes?: string,
  recordedBy?: string
): Promise<DoseEvent> {
  const { data, error } = await supabase
    .from('dose_events')
    .update({
      status,
      acknowledged_at: new Date().toISOString(),
      notes: notes || null,
      recorded_by: recordedBy || null,
    })
    .eq('id', doseEventId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as DoseEvent
}

export async function createMedication(
  medication: {
    elderly_profile_id: string
    medicine_name: string
    dosage_instructions: string
    notes?: string
    start_date: string
    end_date?: string
    created_by: string
  },
  schedules: Array<{
    scheduled_time: string
    frequency: MedicationFrequency
    timezone?: string
    days_of_week?: number[]
  }>
): Promise<MedicationWithSchedules> {
  const { data: medData, error: medError } = await supabase
    .from('medications')
    .insert({
      ...medication,
      status: 'active',
    })
    .select()
    .single()

  if (medError || !medData) {
    throw new Error(medError?.message || 'Failed to create medication')
  }

  if (schedules.length > 0) {
    const schedulesToInsert = schedules.map((s) => ({
      medication_id: medData.id,
      scheduled_time: s.scheduled_time,
      frequency: s.frequency,
      timezone: s.timezone || 'UTC',
      active: true,
      days_of_week: s.days_of_week || null,
    }))

    const { data: schedData, error: schedError } = await supabase
      .from('medication_schedules')
      .insert(schedulesToInsert)
      .select()

    if (schedError) {
      throw new Error(schedError.message)
    }

    return {
      ...(medData as Medication),
      medication_schedules: (schedData || []) as MedicationSchedule[],
    }
  }

  return medData as MedicationWithSchedules
}

export async function deactivateMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update({ status: 'inactive' })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getAdherenceSummary(
  elderlyProfileId: string,
  startDate: string,
  endDate: string
): Promise<AdherenceSummary> {
  const { data, error } = await supabase
    .from('dose_events')
    .select(`
      status,
      medication_schedule:medication_schedules!inner (
        medication:medications!inner (
          elderly_profile_id
        )
      )
    `)
    .eq('medication_schedule.medication.elderly_profile_id', elderlyProfileId)
    .gte('scheduled_for', startDate)
    .lte('scheduled_for', endDate)

  if (error) {
    throw new Error(error.message)
  }

  const counts = { taken: 0, skipped: 0, missed: 0, unconfirmed: 0 }
  let total = 0

  if (data) {
    data.forEach((item: { status: string }) => {
      total++
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++
      }
    })
  }

  const adherencePercentage = total > 0 ? Math.round((counts.taken / total) * 100) : 100

  return {
    elderly_profile_id: elderlyProfileId,
    period_start: startDate,
    period_end: endDate,
    total_scheduled: total,
    taken: counts.taken,
    skipped: counts.skipped,
    missed: counts.missed,
    unconfirmed: counts.unconfirmed,
    adherence_percentage: adherencePercentage,
  }
}
