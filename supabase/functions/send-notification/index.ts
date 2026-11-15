import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/auth.ts'
import { ok, err } from '../_shared/response.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'
const NOTIFICATION_MODE = Deno.env.get('NOTIFICATION_MODE') || 'development'
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'CareCircle <onboarding@resend.dev>'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function is called by other edge functions or cron, with service role
    const authHeader = req.headers.get('Authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      return err('Unauthorized', 401)
    }

    const serviceClient = getServiceClient()
    const body = await req.json().catch(() => ({}))

    // Handle direct invitation dispatch
    if (body.type === 'invitation_created' && body.invited_email) {
      const subject = "You've been invited to CareCircle"
      const safeRole = escapeHtml(String(body.role || 'caregiver'))
      const htmlBody = `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <p>Hi,</p>
        <p>You have been invited to join a care circle on CareCircle as a <strong>${safeRole}</strong>.</p>
        <p>Use the invitation code shared with you to join.</p>
        <p><a href="${APP_URL}/accept-invitation" style="background:#1A5C38;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;display:inline-block;">Accept Invitation</a></p>
        <hr/><p style="font-size:12px;color:#666;">CareCircle — Better care. Shared responsibility.</p>
      </body></html>`

      if (NOTIFICATION_MODE === 'development' || !RESEND_API_KEY) {
        console.log(`[DEV EMAIL] To: ${body.invited_email}, Subject: ${subject}`)
        return ok({ message: 'Invitation email logged (development mode)', dev_mode: true })
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [body.invited_email],
          subject,
          html: htmlBody,
        }),
      })

      if (resendRes.ok) {
        return ok({ message: 'Invitation email sent successfully' })
      } else {
        const errorText = await resendRes.text()
        return err('Failed to send invitation email: ' + errorText, 500)
      }
    }

    const { notification_id } = body
    if (!notification_id) return err('notification_id is required', 400)

    // Fetch the notification with recipient details
    const { data: notification, error: fetchError } = await serviceClient
      .from('notifications')
      .select(`
        *,
        recipient:profiles!recipient_user_id(email, full_name),
        elderly_profile:elderly_profiles!elderly_profile_id(
          user:profiles!user_id(full_name)
        )
      `)
      .eq('id', notification_id)
      .single()

    if (fetchError || !notification) return err('Notification not found', 404)

    // Check if already delivered
    if (notification.delivery_status === 'delivered') {
      return ok({ message: 'Already delivered', skipped: true })
    }

    // Check retry limit
    if (notification.retry_count >= 5) {
      await serviceClient
        .from('notifications')
        .update({ delivery_status: 'failed', last_error: 'Max retries exceeded' })
        .eq('id', notification_id)
      return ok({ message: 'Max retries exceeded', failed: true })
    }

    // Build email content based on notification type
    const { subject, htmlBody } = buildEmailContent(notification)
    const recipientEmail = (notification.recipient as Record<string, string>)?.email

    if (!recipientEmail) {
      await serviceClient
        .from('notifications')
        .update({ delivery_status: 'failed', last_error: 'Recipient email not found' })
        .eq('id', notification_id)
      return err('Recipient email not found', 400)
    }

    // Development mode: log instead of send
    if (NOTIFICATION_MODE === 'development' || !RESEND_API_KEY) {
      console.log(`[DEV EMAIL] To: ${recipientEmail}, Subject: ${subject}`)
      await serviceClient
        .from('notifications')
        .update({ delivery_status: 'sent', delivered_at: new Date().toISOString() })
        .eq('id', notification_id)
      return ok({ message: 'Email logged (development mode)', dev_mode: true })
    }

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject,
        html: htmlBody,
      }),
    })

    if (resendResponse.ok) {
      await serviceClient
        .from('notifications')
        .update({
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', notification_id)
      return ok({ message: 'Email delivered successfully' })
    } else {
      const errorText = await resendResponse.text()
      await serviceClient
        .from('notifications')
        .update({
          delivery_status: 'failed',
          retry_count: (notification.retry_count || 0) + 1,
          last_error: errorText.substring(0, 500),
        })
        .eq('id', notification_id)
      return err('Email delivery failed', 500)
    }
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character)
}

function buildEmailContent(notification: Record<string, unknown>) {
  const elderlyName =
    (notification.elderly_profile as Record<string, Record<string, string>>)?.user?.full_name || 'Your care recipient'
  const recipientName = (notification.recipient as Record<string, string>)?.full_name || 'Caregiver'
  const safeElderlyName = escapeHtml(elderlyName)
  const safeRecipientName = escapeHtml(recipientName)

  const templates: Record<string, { subject: string; body: string }> = {
    upcoming_medication: {
      subject: `Medication reminder for ${safeElderlyName}`,
      body: `<p>Hi ${safeRecipientName},</p><p>This is a reminder that <strong>${safeElderlyName}</strong> has a medication due soon.</p><p><a href="${APP_URL}/dashboard" style="background:#1A5C38;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block;">View in CareCircle</a></p>`,
    },
    missed_medication: {
      subject: `Missed medication alert for ${safeElderlyName}`,
      body: `<p>Hi ${safeRecipientName},</p><p>A medication for <strong>${safeElderlyName}</strong> appears to have been missed. Please check in.</p><p><strong>Note:</strong> This is an automated alert. The medication status may still be pending confirmation.</p><p><a href="${APP_URL}/dashboard" style="background:#DC2626;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block;">View in CareCircle</a></p>`,
    },
    upcoming_appointment: {
      subject: `Upcoming appointment for ${safeElderlyName}`,
      body: `<p>Hi ${safeRecipientName},</p><p><strong>${safeElderlyName}</strong> has a medical appointment tomorrow.</p><p><a href="${APP_URL}/appointments" style="background:#1A5C38;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block;">View appointment details</a></p>`,
    },
    invitation: {
      subject: `You've been invited to CareCircle`,
      body: `<p>Hi,</p><p>You have been invited to join <strong>${safeElderlyName}</strong>'s care circle on CareCircle.</p><p>Log in or register to accept the invitation.</p><p><a href="${APP_URL}/accept-invitation" style="background:#1A5C38;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block;">Accept Invitation</a></p>`,
    },
    caregiver_intervention: {
      subject: `Caregiver intervention recorded for ${safeElderlyName}`,
      body: `<p>Hi ${safeRecipientName},</p><p>A caregiver intervention has been recorded for <strong>${safeElderlyName}</strong>.</p><p><a href="${APP_URL}/dashboard" style="background:#1A5C38;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block;">View in CareCircle</a></p>`,
    },
  }

  const type = notification.notification_type as string
  const template = templates[type] || templates.upcoming_medication

  return {
    subject: template.subject,
    htmlBody: `<!DOCTYPE html><html><body style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:20px;">${template.body}<hr/><p style="font-size:12px;color:#666;">CareCircle — Better care. Shared responsibility.</p></body></html>`,
  }
}
