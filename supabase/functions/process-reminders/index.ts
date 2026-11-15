import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/auth.ts'
import { ok, err } from '../_shared/response.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller has service role key or valid authorization
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!serviceRoleKey || !supabaseUrl || authHeader !== `Bearer ${serviceRoleKey}`) {
      return err('Unauthorized: Service role key required for cron jobs', 401)
    }

    const serviceClient = getServiceClient()
    const now = new Date()
    const summary = {
      medication_reminders_checked: 0,
      medication_notifications_sent: 0,
      appointment_reminders_checked: 0,
      appointment_notifications_sent: 0,
      errors: [] as string[],
    }

    // ============================================================
    // 1. Process Medication Reminders
    // ============================================================
    // Find active medication schedules for active medications
    const { data: activeSchedules, error: schedError } = await serviceClient
      .from('medication_schedules')
      .select(`
        id,
        scheduled_time,
        frequency,
        timezone,
        days_of_week,
        medications!inner (
          id,
          medicine_name,
          dosage_instructions,
          status,
          elderly_profile_id,
          elderly_profiles!inner (
            id,
            user_id
          )
        )
      `)
      .eq('active', true)
      .eq('medications.status', 'active')

    if (schedError) {
      console.error('Error fetching schedules:', schedError)
      summary.errors.push('Failed to fetch schedules: ' + schedError.message)
    } else if (activeSchedules) {
      summary.medication_reminders_checked = activeSchedules.length
      const todayDayOfWeek = now.getUTCDay()
      const todayDateStr = now.toISOString().split('T')[0] // YYYY-MM-DD

      for (const item of activeSchedules) {
        // Check days_of_week if specified
        if (item.days_of_week && Array.isArray(item.days_of_week)) {
          if (!item.days_of_week.includes(todayDayOfWeek)) {
            continue
          }
        }

        const med = item.medications as unknown as {
          id: string
          medicine_name: string
          dosage_instructions: string
          elderly_profile_id: string
          elderly_profiles: { id: string; user_id: string }
        }
        const elderlyProfileId = med.elderly_profile_id
        const elderlyUserId = med.elderly_profiles.user_id

        // Calculate scheduled_for timestamp for today
        const scheduledForStr = `${todayDateStr}T${item.scheduled_time}Z`
        const scheduledTime = new Date(scheduledForStr)

        // Ensure dose_event exists for today (upsert/insert if missing)
        let { data: doseEvent } = await serviceClient
          .from('dose_events')
          .select('*')
          .eq('medication_schedule_id', item.id)
          .eq('scheduled_for', scheduledForStr)
          .maybeSingle()

        if (!doseEvent) {
          const { data: newDose, error: doseInsertErr } = await serviceClient
            .from('dose_events')
            .insert({
              medication_schedule_id: item.id,
              scheduled_for: scheduledForStr,
              status: 'upcoming',
            })
            .select()
            .maybeSingle()

          if (!doseInsertErr && newDose) {
            doseEvent = newDose
          }
        }

        if (!doseEvent) continue

        // Check if dose is 'upcoming' and scheduled within next 30 minutes (or already due by <= 15 min)
        const timeDiffMs = scheduledTime.getTime() - now.getTime()
        const thirtyMinutesMs = 30 * 60 * 1000
        const isUpcomingSoon = doseEvent.status === 'upcoming' && timeDiffMs <= thirtyMinutesMs && timeDiffMs >= -15 * 60 * 1000

        if (isUpcomingSoon) {
          // Find caregivers with receive_notifications permission
          const { data: relationships } = await serviceClient
            .from('care_relationships')
            .select('caregiver_user_id, permissions')
            .eq('elderly_profile_id', elderlyProfileId)
            .eq('status', 'active')

          const eligibleUserIds = new Set<string>()
          eligibleUserIds.add(elderlyUserId) // elderly user themselves

          if (relationships) {
            for (const rel of relationships) {
              if (Array.isArray(rel.permissions) && rel.permissions.includes('receive_notifications')) {
                eligibleUserIds.add(rel.caregiver_user_id)
              }
            }
          }

          for (const recipientId of eligibleUserIds) {
            // Insert notification idempotently
            const { data: notif, error: notifErr } = await serviceClient
              .from('notifications')
              .upsert(
                {
                  elderly_profile_id: elderlyProfileId,
                  recipient_user_id: recipientId,
                  notification_type: 'upcoming_medication',
                  related_event_id: doseEvent.id,
                  related_event_type: 'dose_event',
                  delivery_status: 'pending',
                  scheduled_at: now.toISOString(),
                },
                { onConflict: 'recipient_user_id,notification_type,related_event_id', ignoreDuplicates: true }
              )
              .select('id')
              .maybeSingle()

            if (notif && !notifErr) {
              summary.medication_notifications_sent++
              // Call send-notification
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({ notification_id: notif.id }),
                })
              } catch (dispatchErr) {
                console.error('Failed to trigger send-notification:', dispatchErr)
              }
            }
          }
        }
      }
    }

    // ============================================================
    // 2. Process Appointment Reminders
    // ============================================================
    // Find scheduled appointments for tomorrow
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0] // YYYY-MM-DD

    const { data: upcomingAppointments, error: aptError } = await serviceClient
      .from('appointments')
      .select(`
        id,
        doctor_name,
        hospital_name,
        appointment_date,
        appointment_time,
        elderly_profile_id,
        reminder_sent,
        elderly_profiles!inner (
          id,
          user_id
        )
      `)
      .eq('status', 'scheduled')
      .eq('appointment_date', tomorrowDateStr)
      .eq('reminder_sent', false)

    if (aptError) {
      console.error('Error fetching appointments:', aptError)
      summary.errors.push('Failed to fetch appointments: ' + aptError.message)
    } else if (upcomingAppointments) {
      summary.appointment_reminders_checked = upcomingAppointments.length

      for (const apt of upcomingAppointments) {
        const elderlyData = apt.elderly_profiles as unknown as { id: string; user_id: string }
        const elderlyUserId = elderlyData.user_id

        // Find caregivers with view_appointments or receive_notifications
        const { data: relationships } = await serviceClient
          .from('care_relationships')
          .select('caregiver_user_id, permissions')
          .eq('elderly_profile_id', apt.elderly_profile_id)
          .eq('status', 'active')

        const eligibleUserIds = new Set<string>()
        eligibleUserIds.add(elderlyUserId)

        if (relationships) {
          for (const rel of relationships) {
            if (
              Array.isArray(rel.permissions) &&
              (rel.permissions.includes('view_appointments') || rel.permissions.includes('receive_notifications'))
            ) {
              eligibleUserIds.add(rel.caregiver_user_id)
            }
          }
        }

        for (const recipientId of eligibleUserIds) {
          const { data: notif, error: notifErr } = await serviceClient
            .from('notifications')
            .upsert(
              {
                elderly_profile_id: apt.elderly_profile_id,
                recipient_user_id: recipientId,
                notification_type: 'upcoming_appointment',
                related_event_id: apt.id,
                related_event_type: 'appointment',
                delivery_status: 'pending',
                scheduled_at: now.toISOString(),
              },
              { onConflict: 'recipient_user_id,notification_type,related_event_id', ignoreDuplicates: true }
            )
            .select('id')
            .maybeSingle()

          if (notif && !notifErr) {
            summary.appointment_notifications_sent++
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({ notification_id: notif.id }),
              })
            } catch (dispatchErr) {
              console.error('Failed to trigger send-notification:', dispatchErr)
            }
          }
        }

        // Mark appointment reminder_sent = true
        await serviceClient
          .from('appointments')
          .update({ reminder_sent: true })
          .eq('id', apt.id)
      }
    }

    return ok({ summary })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
