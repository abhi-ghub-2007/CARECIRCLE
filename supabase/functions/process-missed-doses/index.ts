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
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

    const summary = {
      missed_doses_marked: 0,
      notifications_dispatched: 0,
      errors: [] as string[],
    }

    // 1. Find dose_events with status = 'upcoming' or 'due' where scheduled_for < NOW() - 30 minutes
    // CRITICAL: An 'unconfirmed' status means the system doesn't know. Only use 'missed'
    // when grace period has elapsed. Never infer missed from unconfirmed alone.
    const { data: overdueDoses, error: fetchErr } = await serviceClient
      .from('dose_events')
      .select(`
        id,
        scheduled_for,
        status,
        medication_schedule_id,
        medication_schedules!inner (
          id,
          medications!inner (
            id,
            medicine_name,
            elderly_profile_id,
            elderly_profiles!inner (
              id,
              user_id
            )
          )
        )
      `)
      .in('status', ['upcoming', 'due'])
      .lt('scheduled_for', thirtyMinutesAgo)

    if (fetchErr) {
      console.error('Error fetching overdue doses:', fetchErr)
      return err('Database error: ' + fetchErr.message, 500)
    }

    if (!overdueDoses || overdueDoses.length === 0) {
      return ok({ message: 'No overdue doses found', summary })
    }

    for (const dose of overdueDoses) {
      // Transition to 'missed'
      const { data: updatedDose, error: updErr } = await serviceClient
        .from('dose_events')
        .update({
          status: 'missed',
          acknowledged_at: now.toISOString(),
        })
        .eq('id', dose.id)
        .in('status', ['upcoming', 'due']) // guard against race condition
        .select()
        .maybeSingle()

      if (updErr || !updatedDose) {
        continue // Already updated or conflict
      }

      summary.missed_doses_marked++

      const scheduleData = dose.medication_schedules as unknown as {
        medications: {
          id: string
          medicine_name: string
          elderly_profile_id: string
          elderly_profiles: { id: string; user_id: string }
        }
      }
      const med = scheduleData.medications
      const elderlyProfileId = med.elderly_profile_id
      const elderlyUserId = med.elderly_profiles.user_id

      // Audit log
      await serviceClient.from('audit_logs').insert({
        user_id: null,
        action: 'mark_missed_dose',
        resource_type: 'dose_event',
        resource_id: dose.id,
        metadata: {
          scheduled_for: dose.scheduled_for,
          elderly_profile_id: elderlyProfileId,
          medicine_name: med.medicine_name,
        },
      })

      // Find care circle members with receive_notifications permission
      const { data: relationships } = await serviceClient
        .from('care_relationships')
        .select('caregiver_user_id, permissions')
        .eq('elderly_profile_id', elderlyProfileId)
        .eq('status', 'active')

      const recipientIds = new Set<string>()
      recipientIds.add(elderlyUserId)

      if (relationships) {
        for (const rel of relationships) {
          if (Array.isArray(rel.permissions) && rel.permissions.includes('receive_notifications')) {
            recipientIds.add(rel.caregiver_user_id)
          }
        }
      }

      // Create missed_medication notification records idempotently
      for (const recipientId of recipientIds) {
        const { data: notif, error: notifErr } = await serviceClient
          .from('notifications')
          .upsert(
            {
              elderly_profile_id: elderlyProfileId,
              recipient_user_id: recipientId,
              notification_type: 'missed_medication',
              related_event_id: dose.id,
              related_event_type: 'dose_event',
              delivery_status: 'pending',
              scheduled_at: now.toISOString(),
            },
            { onConflict: 'recipient_user_id,notification_type,related_event_id', ignoreDuplicates: true }
          )
          .select('id')
          .maybeSingle()

        if (notif && !notifErr) {
          summary.notifications_dispatched++
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

    return ok({ summary })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
