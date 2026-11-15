import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth } from '../_shared/auth.ts'
import { ok, err, validationErr } from '../_shared/response.ts'
import { validateEmail, validateEnum, validateUUID, collectErrors } from '../_shared/validate.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, supabase } = await requireAuth(req)

    // Verify user is elderly
    if (user.role !== 'elderly') {
      return err('Only elderly users can create invitations', 403)
    }

    const body = await req.json()
    const { invited_email, role, permissions } = body

    // Validate inputs
    const errors = collectErrors([
      validateEmail(invited_email, 'invited_email'),
      validateEnum(role, 'role', ['family', 'caretaker']),
    ])

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        errors.push('permissions must be an array')
      } else {
        const validPerms = [
          'view_medications', 'view_appointments', 'view_adherence',
          'receive_notifications', 'record_doses', 'manage_medications', 'manage_appointments',
        ]
        for (const p of permissions) {
          if (!validPerms.includes(p)) {
            errors.push(`Invalid permission: ${p}`)
          }
        }
      }
    }

    if (errors.length > 0) return validationErr(errors)

    // Get elderly profile (DB-verified ownership, not from client)
    const { data: elderlyProfile, error: epError } = await supabase
      .from('elderly_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (epError || !elderlyProfile) {
      return err('Elderly profile not found', 404)
    }

    // Rate limiting: max 5 invitations per elderly profile per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('elderly_profile_id', elderlyProfile.id)
      .gte('created_at', oneHourAgo)

    if ((count || 0) >= 5) {
      return err('Rate limit exceeded. Maximum 5 invitations per hour.', 429)
    }

    // Check no active unconsumed invitation exists for this email+elderly combo
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('elderly_profile_id', elderlyProfile.id)
      .eq('invited_email', invited_email.toLowerCase())
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingInvitation) {
      return err('An active invitation already exists for this email address', 409)
    }

    // Generate cryptographically secure invitation code (32 random bytes → 64-char hex)
    const rawBytes = new Uint8Array(32)
    crypto.getRandomValues(rawBytes)
    const plaintextCode = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // Hash the code with SHA-256 (Web Crypto API — no library)
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(plaintextCode))
    const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // Set default permissions based on role
    const defaultPermissions = role === 'family'
      ? ['view_medications', 'view_appointments', 'view_adherence', 'receive_notifications']
      : ['view_medications', 'view_appointments', 'record_doses', 'view_adherence', 'receive_notifications']

    const finalPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions : defaultPermissions

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    // Insert invitation record
    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        elderly_profile_id: elderlyProfile.id,
        code_hash: codeHash,
        invited_email: invited_email.toLowerCase(),
        role,
        permissions: finalPermissions,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select('id, invited_email, role, expires_at, created_at')
      .single()

    if (insertError) {
      console.error('Insert invitation error:', insertError)
      return err('Failed to create invitation', 500)
    }

    // Audit log
    await supabase.rpc('create_audit_log', {
      p_action: 'create_invitation',
      p_resource_type: 'invitation',
      p_resource_id: invitation.id,
      p_metadata: { invited_email: invited_email.toLowerCase(), role },
    })

    // Queue invitation notification email
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && serviceKey) {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: 'invitation_created',
            invited_email: invited_email.toLowerCase(),
            elderly_profile_id: elderlyProfile.id,
            role,
            expires_at: expiresAt,
          }),
        })
      }
    } catch (notifErr) {
      console.error('Failed to queue invitation email:', notifErr)
    }

    return ok(
      {
        invitation_id: invitation.id,
        code: plaintextCode, // Returned ONCE — user must share this securely
        invited_email: invitation.invited_email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
      201
    )
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
