import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth, AuthenticatedUser } from '../_shared/auth.ts'
import { ok, err, validationErr } from '../_shared/response.ts'
import { validateUUID, validateEnum, collectErrors } from '../_shared/validate.ts'
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function getElderlyProfileForSchedule(
  supabase: SupabaseClient,
  scheduleId: string
): Promise<{ elderlyProfileId: string; medicationName: string } | null> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select(`
      id,
      medications:medication_id (
        elderly_profile_id,
        medicine_name
      )
    `)
    .eq('id', scheduleId)
    .maybeSingle()

  if (error || !data || !data.medications) return null
  const med = data.medications as unknown as { elderly_profile_id: string; medicine_name: string }
  return {
    elderlyProfileId: med.elderly_profile_id,
    medicationName: med.medicine_name,
  }
}

async function checkRecordDoseAccess(
  supabase: SupabaseClient,
  user: AuthenticatedUser,
  elderlyProfileId: string,
  forWrite = true
): Promise<boolean> {
  if (user.role === 'elderly') {
    const { data } = await supabase
      .from('elderly_profiles')
      .select('id')
      .eq('id', elderlyProfileId)
      .eq('user_id', user.id)
      .maybeSingle()
    return !!data
  }

  // Caregiver check
  const { data: relationship } = await supabase
    .from('care_relationships')
    .select('permissions')
    .eq('elderly_profile_id', elderlyProfileId)
    .eq('caregiver_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!relationship || !Array.isArray(relationship.permissions)) return false

  if (forWrite) {
    return relationship.permissions.includes('record_doses')
  }
  return (
    relationship.permissions.includes('record_doses') ||
    relationship.permissions.includes('view_medications') ||
    relationship.permissions.includes('view_adherence')
  )
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, supabase } = await requireAuth(req)
    const url = new URL(req.url)

    // ============================================================
    // GET: Retrieve dose events
    // ============================================================
    if (req.method === 'GET') {
      const scheduleId = url.searchParams.get('medication_schedule_id')
      const elderlyProfileId = url.searchParams.get('elderly_profile_id')
      const dateFrom = url.searchParams.get('date_from')
      const dateTo = url.searchParams.get('date_to')
      const statusFilter = url.searchParams.get('status')

      if (scheduleId) {
        const scheduleInfo = await getElderlyProfileForSchedule(supabase, scheduleId)
        if (!scheduleInfo) return err('Medication schedule not found', 404)

        const hasAccess = await checkRecordDoseAccess(supabase, user, scheduleInfo.elderlyProfileId, false)
        if (!hasAccess) return err('Permission denied', 403)

        let query = supabase
          .from('dose_events')
          .select('*')
          .eq('medication_schedule_id', scheduleId)
          .order('scheduled_for', { ascending: false })

        if (dateFrom) query = query.gte('scheduled_for', dateFrom)
        if (dateTo) query = query.lte('scheduled_for', dateTo)
        if (statusFilter) query = query.eq('status', statusFilter)

        const { data: doses, error } = await query
        if (error) return err('Failed to fetch dose events', 500)
        return ok({ dose_events: doses })
      }

      // Query by elderly profile
      let targetProfileId = elderlyProfileId
      if (!targetProfileId && user.role === 'elderly') {
        const { data: myProfile } = await supabase
          .from('elderly_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (myProfile) targetProfileId = myProfile.id
      }

      if (!targetProfileId) {
        return err('medication_schedule_id or elderly_profile_id is required', 400)
      }

      const hasAccess = await checkRecordDoseAccess(supabase, user, targetProfileId, false)
      if (!hasAccess) return err('Permission denied', 403)

      let query = supabase
        .from('dose_events')
        .select(`
          *,
          medication_schedules!inner (
            id,
            scheduled_time,
            frequency,
            medications!inner (
              id,
              medicine_name,
              elderly_profile_id
            )
          )
        `)
        .eq('medication_schedules.medications.elderly_profile_id', targetProfileId)
        .order('scheduled_for', { ascending: false })

      if (dateFrom) query = query.gte('scheduled_for', dateFrom)
      if (dateTo) query = query.lte('scheduled_for', dateTo)
      if (statusFilter) query = query.eq('status', statusFilter)

      const { data: doses, error } = await query
      if (error) return err('Failed to fetch dose events: ' + error.message, 500)
      return ok({ dose_events: doses })
    }

    // ============================================================
    // POST: Record dose event
    // ============================================================
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const {
        medication_schedule_id,
        scheduled_for,
        status,
        notes,
        snoozed_until,
      } = body

      // Input validation
      const errors = collectErrors([
        validateUUID(medication_schedule_id, 'medication_schedule_id'),
        validateEnum(status, 'status', ['taken', 'skipped', 'snoozed', 'missed', 'unconfirmed']),
      ])

      if (!scheduled_for || isNaN(new Date(scheduled_for).getTime())) {
        errors.push('scheduled_for must be a valid ISO timestamp')
      }

      if (status === 'snoozed') {
        if (!snoozed_until || isNaN(new Date(snoozed_until).getTime())) {
          errors.push('snoozed_until must be a valid ISO timestamp when status is snoozed')
        } else if (new Date(snoozed_until) <= new Date()) {
          errors.push('snoozed_until must be in the future')
        }
      }

      if (errors.length > 0) return validationErr(errors)

      // Verify schedule belongs to an accessible elderly profile
      const scheduleInfo = await getElderlyProfileForSchedule(supabase, medication_schedule_id)
      if (!scheduleInfo) {
        return err('Medication schedule not found', 404)
      }

      const hasAccess = await checkRecordDoseAccess(supabase, user, scheduleInfo.elderlyProfileId, true)
      if (!hasAccess) {
        return err('Permission denied. You do not have permission to record doses for this profile.', 403)
      }

      const isTerminal = ['taken', 'skipped', 'missed'].includes(status)
      const acknowledgedAt = isTerminal ? new Date().toISOString() : (status === 'snoozed' ? new Date().toISOString() : null)

      // Upsert dose event (unique on medication_schedule_id + scheduled_for)
      const payload: Record<string, unknown> = {
        medication_schedule_id,
        scheduled_for: new Date(scheduled_for).toISOString(),
        status,
        acknowledged_at: acknowledgedAt,
        recorded_by: user.id,
        notes: notes?.trim() || null,
        snoozed_until: status === 'snoozed' ? new Date(snoozed_until).toISOString() : null,
      }

      const { data: doseEvent, error: upsertError } = await supabase
        .from('dose_events')
        .upsert(payload, { onConflict: 'medication_schedule_id,scheduled_for' })
        .select()
        .single()

      if (upsertError) {
        console.error('Upsert dose event error:', upsertError)
        return err('Failed to record dose: ' + upsertError.message, 500)
      }

      // Audit log
      await supabase.rpc('create_audit_log', {
        p_action: 'record_dose',
        p_resource_type: 'dose_event',
        p_resource_id: doseEvent.id,
        p_metadata: {
          medication_schedule_id,
          scheduled_for,
          status,
          elderly_profile_id: scheduleInfo.elderlyProfileId,
          medicine_name: scheduleInfo.medicationName,
        },
      })

      // If caregiver recorded this dose, optionally notify elderly/care circle of caregiver intervention
      if (user.role !== 'elderly') {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (supabaseUrl && serviceKey) {
          fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              type: 'caregiver_intervention',
              elderly_profile_id: scheduleInfo.elderlyProfileId,
              dose_event_id: doseEvent.id,
              actor_id: user.id,
              status,
            }),
          }).catch(err => console.error('Notification error:', err))
        }
      }

      return ok({ dose_event: doseEvent }, 200)
    }

    return err('Method not allowed', 405)
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
