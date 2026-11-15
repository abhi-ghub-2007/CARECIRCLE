import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth, AuthenticatedUser } from '../_shared/auth.ts'
import { ok, err, validationErr } from '../_shared/response.ts'
import {
  validateString,
  validateDate,
  validateTime,
  validateEnum,
  validateUUID,
  collectErrors,
} from '../_shared/validate.ts'
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() })
    return true
  } catch {
    return false
  }
}

async function checkAppointmentAccess(
  supabase: SupabaseClient,
  user: AuthenticatedUser,
  elderlyProfileId: string,
  requiredPermission: 'view_appointments' | 'manage_appointments'
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

  if (requiredPermission === 'manage_appointments') {
    return relationship.permissions.includes('manage_appointments')
  }

  return (
    relationship.permissions.includes('view_appointments') ||
    relationship.permissions.includes('manage_appointments')
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
    // GET: Retrieve appointment(s)
    // ============================================================
    if (req.method === 'GET') {
      const id = url.searchParams.get('id')
      const elderlyProfileId = url.searchParams.get('elderly_profile_id')
      const statusFilter = url.searchParams.get('status')
      const dateFrom = url.searchParams.get('date_from')
      const dateTo = url.searchParams.get('date_to')

      // Single appointment
      if (id) {
        const { data: apt, error: aptErr } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (aptErr || !apt) return err('Appointment not found', 404)

        const hasAccess = await checkAppointmentAccess(supabase, user, apt.elderly_profile_id, 'view_appointments')
        if (!hasAccess) return err('Unauthorized access to appointment', 403)

        return ok({ appointment: apt })
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
        return err('elderly_profile_id is required', 400)
      }

      const hasAccess = await checkAppointmentAccess(supabase, user, targetProfileId, 'view_appointments')
      if (!hasAccess) return err('Unauthorized access to appointments for this profile', 403)

      let query = supabase
        .from('appointments')
        .select('*')
        .eq('elderly_profile_id', targetProfileId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (dateFrom) {
        query = query.gte('appointment_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('appointment_date', dateTo)
      }

      const { data: appointments, error } = await query
      if (error) return err('Failed to fetch appointments: ' + error.message, 500)

      return ok({ appointments })
    }

    // ============================================================
    // POST: Create appointment
    // ============================================================
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const {
        elderly_profile_id,
        doctor_name,
        hospital_name,
        appointment_date,
        appointment_time,
        timezone = 'UTC',
        purpose,
        notes,
      } = body

      let targetElderlyProfileId = elderly_profile_id
      if (!targetElderlyProfileId && user.role === 'elderly') {
        const { data: myProfile } = await supabase
          .from('elderly_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (myProfile) targetElderlyProfileId = myProfile.id
      }

      const errors = collectErrors([
        validateUUID(targetElderlyProfileId, 'elderly_profile_id'),
        validateString(doctor_name, 'doctor_name', { min: 1, max: 255 }),
        validateDate(appointment_date, 'appointment_date'),
        validateTime(appointment_time, 'appointment_time'),
      ])

      if (hospital_name !== undefined && hospital_name !== null) {
        const hErr = validateString(hospital_name, 'hospital_name', { min: 1, max: 255, required: false })
        if (hErr) errors.push(hErr)
      }

      if (!isValidTimezone(timezone)) {
        errors.push('timezone must be a valid IANA timezone string (e.g., "America/New_York", "UTC")')
      }

      // Check not in distant past (must be >= yesterday)
      if (appointment_date) {
        const aptDate = new Date(appointment_date)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        if (aptDate < yesterday) {
          errors.push('Cannot create an appointment in the past')
        }
      }

      if (errors.length > 0) return validationErr(errors)

      const hasAccess = await checkAppointmentAccess(supabase, user, targetElderlyProfileId, 'manage_appointments')
      if (!hasAccess) return err('Permission denied to manage appointments for this profile', 403)

      const { data: appointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          elderly_profile_id: targetElderlyProfileId,
          doctor_name: doctor_name.trim(),
          hospital_name: hospital_name?.trim() || null,
          appointment_date,
          appointment_time,
          timezone: timezone.trim(),
          purpose: purpose?.trim() || null,
          notes: notes?.trim() || null,
          status: 'scheduled',
          reminder_sent: false,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert appointment error:', insertError)
        return err('Failed to create appointment: ' + insertError.message, 500)
      }

      await supabase.rpc('create_audit_log', {
        p_action: 'create_appointment',
        p_resource_type: 'appointment',
        p_resource_id: appointment.id,
        p_metadata: {
          doctor_name: appointment.doctor_name,
          appointment_date,
          appointment_time,
          elderly_profile_id: targetElderlyProfileId,
        },
      })

      return ok({ appointment }, 201)
    }

    // ============================================================
    // PUT: Update appointment
    // ============================================================
    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}))
      const {
        id,
        doctor_name,
        hospital_name,
        appointment_date,
        appointment_time,
        timezone,
        purpose,
        notes,
        status,
      } = body

      const errors = collectErrors([validateUUID(id, 'id')])

      if (doctor_name !== undefined) {
        const dErr = validateString(doctor_name, 'doctor_name', { min: 1, max: 255 })
        if (dErr) errors.push(dErr)
      }
      if (hospital_name !== undefined && hospital_name !== null) {
        const hErr = validateString(hospital_name, 'hospital_name', { min: 1, max: 255, required: false })
        if (hErr) errors.push(hErr)
      }
      if (appointment_date !== undefined) {
        const dtErr = validateDate(appointment_date, 'appointment_date')
        if (dtErr) errors.push(dtErr)
      }
      if (appointment_time !== undefined) {
        const tmErr = validateTime(appointment_time, 'appointment_time')
        if (tmErr) errors.push(tmErr)
      }
      if (timezone !== undefined && !isValidTimezone(timezone)) {
        errors.push('timezone must be a valid IANA timezone string')
      }
      if (status !== undefined) {
        const sErr = validateEnum(status, 'status', ['scheduled', 'completed', 'cancelled'])
        if (sErr) errors.push(sErr)
      }

      if (errors.length > 0) return validationErr(errors)

      // Fetch existing appointment
      const { data: existing, error: existErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (existErr || !existing) return err('Appointment not found', 404)

      const hasAccess = await checkAppointmentAccess(supabase, user, existing.elderly_profile_id, 'manage_appointments')
      if (!hasAccess) return err('Permission denied to update appointment', 403)

      const updates: Record<string, unknown> = {}
      if (doctor_name !== undefined) updates.doctor_name = doctor_name.trim()
      if (hospital_name !== undefined) updates.hospital_name = hospital_name?.trim() || null
      if (appointment_date !== undefined) updates.appointment_date = appointment_date
      if (appointment_time !== undefined) updates.appointment_time = appointment_time
      if (timezone !== undefined) updates.timezone = timezone.trim()
      if (purpose !== undefined) updates.purpose = purpose?.trim() || null
      if (notes !== undefined) updates.notes = notes?.trim() || null
      if (status !== undefined) updates.status = status

      const { data: updated, error: updErr } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updErr) return err('Failed to update appointment: ' + updErr.message, 500)

      await supabase.rpc('create_audit_log', {
        p_action: 'update_appointment',
        p_resource_type: 'appointment',
        p_resource_id: id,
        p_metadata: updates,
      })

      return ok({ appointment: updated })
    }

    // ============================================================
    // PATCH: Cancel appointment (cancel sets status = 'cancelled', never deletes)
    // ============================================================
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}))
      const urlId = url.searchParams.get('id')
      const id = urlId || body.id

      if (!id) return err('Appointment ID is required', 400)

      const { data: existing, error: existErr } = await supabase
        .from('appointments')
        .select('id, elderly_profile_id, status')
        .eq('id', id)
        .maybeSingle()

      if (existErr || !existing) return err('Appointment not found', 404)

      const hasAccess = await checkAppointmentAccess(supabase, user, existing.elderly_profile_id, 'manage_appointments')
      if (!hasAccess) return err('Permission denied to cancel appointment', 403)

      const { data: cancelled, error: cancelErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single()

      if (cancelErr) return err('Failed to cancel appointment: ' + cancelErr.message, 500)

      await supabase.rpc('create_audit_log', {
        p_action: 'cancel_appointment',
        p_resource_type: 'appointment',
        p_resource_id: id,
        p_metadata: { status: 'cancelled' },
      })

      return ok({ message: 'Appointment cancelled successfully', appointment: cancelled })
    }

    return err('Method not allowed', 405)
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
