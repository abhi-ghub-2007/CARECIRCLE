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

async function checkAccess(
  supabase: SupabaseClient,
  user: AuthenticatedUser,
  elderlyProfileId: string,
  requiredPermission: 'view_medications' | 'manage_medications'
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

  if (!relationship) return false

  // For write operations ('manage_medications'), check specific permission
  if (requiredPermission === 'manage_medications') {
    return Array.isArray(relationship.permissions) && relationship.permissions.includes('manage_medications')
  }

  // For read operations ('view_medications')
  return (
    Array.isArray(relationship.permissions) &&
    (relationship.permissions.includes('view_medications') || relationship.permissions.includes('manage_medications'))
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
    // GET: List medications or get single medication / schedules
    // ============================================================
    if (req.method === 'GET') {
      const id = url.searchParams.get('id')
      const elderlyProfileId = url.searchParams.get('elderly_profile_id')
      const medicationId = url.searchParams.get('medication_id')
      const schedulesOnly = url.searchParams.get('schedules_only') === 'true'
      const statusFilter = url.searchParams.get('status') || 'active'

      // Sub-route: Get schedules for a medication
      if (schedulesOnly && medicationId) {
        const { data: med, error: medErr } = await supabase
          .from('medications')
          .select('id, elderly_profile_id')
          .eq('id', medicationId)
          .maybeSingle()

        if (medErr || !med) return err('Medication not found', 404)

        const hasAccess = await checkAccess(supabase, user, med.elderly_profile_id, 'view_medications')
        if (!hasAccess) return err('Unauthorized access to medication schedules', 403)

        const { data: schedules, error: schedErr } = await supabase
          .from('medication_schedules')
          .select('*')
          .eq('medication_id', medicationId)
          .order('scheduled_time', { ascending: true })

        if (schedErr) return err('Failed to fetch schedules', 500)
        return ok({ schedules })
      }

      // Single medication with schedules
      if (id) {
        const { data: med, error: medErr } = await supabase
          .from('medications')
          .select('*, medication_schedules(*)')
          .eq('id', id)
          .maybeSingle()

        if (medErr || !med) return err('Medication not found', 404)

        const hasAccess = await checkAccess(supabase, user, med.elderly_profile_id, 'view_medications')
        if (!hasAccess) return err('Unauthorized access to medication', 403)

        return ok({ medication: med })
      }

      // List medications for elderly profile
      if (!elderlyProfileId) {
        // If elderly user and no elderly_profile_id specified, resolve their own profile
        if (user.role === 'elderly') {
          const { data: myProfile } = await supabase
            .from('elderly_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!myProfile) return err('Elderly profile not found', 404)
          
          let query = supabase
            .from('medications')
            .select('*, medication_schedules(*)')
            .eq('elderly_profile_id', myProfile.id)
            .order('created_at', { ascending: false })

          if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
          }

          const { data: meds, error } = await query
          if (error) return err('Failed to fetch medications', 500)
          return ok({ medications: meds })
        }
        return err('elderly_profile_id is required', 400)
      }

      // Verify access to elderly profile
      const hasAccess = await checkAccess(supabase, user, elderlyProfileId, 'view_medications')
      if (!hasAccess) return err('Unauthorized access to elderly profile', 403)

      let query = supabase
        .from('medications')
        .select('*, medication_schedules(*)')
        .eq('elderly_profile_id', elderlyProfileId)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: meds, error } = await query
      if (error) return err('Failed to fetch medications', 500)
      return ok({ medications: meds })
    }

    // ============================================================
    // POST: Create medication OR create schedule
    // ============================================================
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      const action = body.action

      // Sub-action: create schedule
      if (action === 'create_schedule') {
        const { medication_id, scheduled_time, frequency, timezone = 'UTC', days_of_week } = body

        const errors = collectErrors([
          validateUUID(medication_id, 'medication_id'),
          validateTime(scheduled_time, 'scheduled_time'),
          validateEnum(frequency, 'frequency', [
            'daily',
            'twice_daily',
            'three_times_daily',
            'weekly',
            'as_needed',
            'custom',
          ]),
        ])
        if (errors.length > 0) return validationErr(errors)

        // Find medication
        const { data: med, error: medErr } = await supabase
          .from('medications')
          .select('id, elderly_profile_id')
          .eq('id', medication_id)
          .maybeSingle()

        if (medErr || !med) return err('Medication not found', 404)

        const hasAccess = await checkAccess(supabase, user, med.elderly_profile_id, 'manage_medications')
        if (!hasAccess) return err('Permission denied to manage medications for this profile', 403)

        const { data: schedule, error: schedErr } = await supabase
          .from('medication_schedules')
          .insert({
            medication_id,
            scheduled_time,
            frequency,
            timezone,
            days_of_week: Array.isArray(days_of_week) ? days_of_week : null,
            active: true,
          })
          .select()
          .single()

        if (schedErr) return err('Failed to create schedule: ' + schedErr.message, 500)

        await supabase.rpc('create_audit_log', {
          p_action: 'create_medication_schedule',
          p_resource_type: 'medication_schedule',
          p_resource_id: schedule.id,
          p_metadata: { medication_id, scheduled_time, frequency },
        })

        return ok({ schedule }, 201)
      }

      // Default POST: Create medication
      const {
        elderly_profile_id,
        medicine_name,
        dosage_instructions,
        notes,
        start_date,
        end_date,
        schedules,
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
        validateString(medicine_name, 'medicine_name', { min: 1, max: 255 }),
        validateString(dosage_instructions, 'dosage_instructions', { min: 1 }),
        validateDate(start_date, 'start_date'),
      ])

      if (end_date) {
        const endErr = validateDate(end_date, 'end_date')
        if (endErr) errors.push(endErr)
        else if (new Date(end_date) < new Date(start_date)) {
          errors.push('end_date must be on or after start_date')
        }
      }

      if (errors.length > 0) return validationErr(errors)

      const hasAccess = await checkAccess(supabase, user, targetElderlyProfileId, 'manage_medications')
      if (!hasAccess) return err('Permission denied to manage medications for this profile', 403)

      const { data: med, error: insertError } = await supabase
        .from('medications')
        .insert({
          elderly_profile_id: targetElderlyProfileId,
          medicine_name: medicine_name.trim(),
          dosage_instructions: dosage_instructions.trim(),
          notes: notes?.trim() || null,
          start_date,
          end_date: end_date || null,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert medication error:', insertError)
        return err('Failed to create medication: ' + insertError.message, 500)
      }

      // If schedules were provided, insert them
      let insertedSchedules: unknown[] = []
      if (Array.isArray(schedules) && schedules.length > 0) {
        const scheduleRows = schedules.map(s => ({
          medication_id: med.id,
          scheduled_time: s.scheduled_time,
          frequency: s.frequency || 'daily',
          timezone: s.timezone || 'UTC',
          days_of_week: Array.isArray(s.days_of_week) ? s.days_of_week : null,
          active: true,
        }))

        const { data: schedData, error: sErr } = await supabase
          .from('medication_schedules')
          .insert(scheduleRows)
          .select()

        if (!sErr && schedData) {
          insertedSchedules = schedData
        }
      }

      await supabase.rpc('create_audit_log', {
        p_action: 'create_medication',
        p_resource_type: 'medication',
        p_resource_id: med.id,
        p_metadata: { medicine_name: med.medicine_name, elderly_profile_id: targetElderlyProfileId },
      })

      return ok({ medication: { ...med, schedules: insertedSchedules } }, 201)
    }

    // ============================================================
    // PUT: Update medication OR update schedule
    // ============================================================
    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}))
      const action = body.action

      if (action === 'update_schedule') {
        const { id, scheduled_time, frequency, timezone, days_of_week, active } = body
        const errors = collectErrors([
          validateUUID(id, 'id'),
        ])
        if (scheduled_time) {
          const tErr = validateTime(scheduled_time, 'scheduled_time')
          if (tErr) errors.push(tErr)
        }
        if (frequency) {
          const fErr = validateEnum(frequency, 'frequency', [
            'daily',
            'twice_daily',
            'three_times_daily',
            'weekly',
            'as_needed',
            'custom',
          ])
          if (fErr) errors.push(fErr)
        }
        if (errors.length > 0) return validationErr(errors)

        // Lookup schedule and check permission
        const { data: sched, error: schedErr } = await supabase
          .from('medication_schedules')
          .select('*, medications(elderly_profile_id)')
          .eq('id', id)
          .maybeSingle()

        if (schedErr || !sched) return err('Schedule not found', 404)

        const elderlyProfileId = (sched.medications as { elderly_profile_id: string })?.elderly_profile_id
        const hasAccess = await checkAccess(supabase, user, elderlyProfileId, 'manage_medications')
        if (!hasAccess) return err('Permission denied', 403)

        const updatePayload: Record<string, unknown> = {}
        if (scheduled_time !== undefined) updatePayload.scheduled_time = scheduled_time
        if (frequency !== undefined) updatePayload.frequency = frequency
        if (timezone !== undefined) updatePayload.timezone = timezone
        if (days_of_week !== undefined) updatePayload.days_of_week = days_of_week
        if (active !== undefined) updatePayload.active = active

        const { data: updatedSched, error: updErr } = await supabase
          .from('medication_schedules')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single()

        if (updErr) return err('Failed to update schedule: ' + updErr.message, 500)
        return ok({ schedule: updatedSched })
      }

      // Default PUT: update medication
      const { id, medicine_name, dosage_instructions, notes, start_date, end_date, status } = body

      const errors = collectErrors([
        validateUUID(id, 'id'),
      ])
      if (medicine_name !== undefined) {
        const mErr = validateString(medicine_name, 'medicine_name', { min: 1, max: 255 })
        if (mErr) errors.push(mErr)
      }
      if (dosage_instructions !== undefined) {
        const dErr = validateString(dosage_instructions, 'dosage_instructions', { min: 1 })
        if (dErr) errors.push(dErr)
      }
      if (start_date !== undefined) {
        const sErr = validateDate(start_date, 'start_date')
        if (sErr) errors.push(sErr)
      }
      if (end_date !== undefined && end_date !== null) {
        const eErr = validateDate(end_date, 'end_date')
        if (eErr) errors.push(eErr)
      }
      if (status !== undefined) {
        const stErr = validateEnum(status, 'status', ['active', 'inactive', 'completed'])
        if (stErr) errors.push(stErr)
      }
      if (errors.length > 0) return validationErr(errors)

      // Fetch existing medication
      const { data: existing, error: existErr } = await supabase
        .from('medications')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (existErr || !existing) return err('Medication not found', 404)

      const hasAccess = await checkAccess(supabase, user, existing.elderly_profile_id, 'manage_medications')
      if (!hasAccess) return err('Permission denied to update this medication', 403)

      const updates: Record<string, unknown> = {}
      if (medicine_name !== undefined) updates.medicine_name = medicine_name.trim()
      if (dosage_instructions !== undefined) updates.dosage_instructions = dosage_instructions.trim()
      if (notes !== undefined) updates.notes = notes?.trim() || null
      if (start_date !== undefined) updates.start_date = start_date
      if (end_date !== undefined) updates.end_date = end_date
      if (status !== undefined) updates.status = status

      const { data: updated, error: updError } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updError) return err('Failed to update medication: ' + updError.message, 500)

      await supabase.rpc('create_audit_log', {
        p_action: 'update_medication',
        p_resource_type: 'medication',
        p_resource_id: id,
        p_metadata: updates,
      })

      return ok({ medication: updated })
    }

    // ============================================================
    // DELETE / PATCH: Soft delete (deactivate) medication
    // ============================================================
    if (req.method === 'DELETE' || req.method === 'PATCH') {
      const urlId = url.searchParams.get('id')
      const body = await req.json().catch(() => ({}))
      const id = urlId || body.id

      if (!id) return err('Medication ID is required', 400)

      const { data: existing, error: existErr } = await supabase
        .from('medications')
        .select('id, elderly_profile_id')
        .eq('id', id)
        .maybeSingle()

      if (existErr || !existing) return err('Medication not found', 404)

      const hasAccess = await checkAccess(supabase, user, existing.elderly_profile_id, 'manage_medications')
      if (!hasAccess) return err('Permission denied to deactivate this medication', 403)

      // Soft delete: status = 'inactive'
      const { data: deactivated, error: deactErr } = await supabase
        .from('medications')
        .update({ status: 'inactive' })
        .eq('id', id)
        .select()
        .single()

      if (deactErr) return err('Failed to deactivate medication: ' + deactErr.message, 500)

      // Also deactivate schedules
      await supabase
        .from('medication_schedules')
        .update({ active: false })
        .eq('medication_id', id)

      await supabase.rpc('create_audit_log', {
        p_action: 'deactivate_medication',
        p_resource_type: 'medication',
        p_resource_id: id,
        p_metadata: { status: 'inactive' },
      })

      return ok({ message: 'Medication deactivated successfully', medication: deactivated })
    }

    return err('Method not allowed', 405)
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
