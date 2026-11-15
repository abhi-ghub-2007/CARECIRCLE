import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { requireAuth, getServiceClient } from '../_shared/auth.ts'
import { ok, err, validationErr } from '../_shared/response.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user } = await requireAuth(req)
    const serviceClient = getServiceClient()

    const body = await req.json()
    const { code } = body || {}

    // The invitation code is a 256-bit random hex token. The profile ID is
    // deliberately derived from the invitation record, never trusted from client input.
    if (typeof code !== 'string' || !/^[a-f0-9]{64}$/i.test(code)) {
      return validationErr(['Invalid invitation code format'])
    }

    // Hash the provided code with SHA-256 (must match create-invitation)
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(code))
    const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    // Look up invitation using service role (bypasses RLS so recipient can find it)
    const { data: invitation, error: findError } = await serviceClient
      .from('invitations')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle()

    if (findError) {
      console.error('Find invitation error:', findError)
      return err('Invalid invitation code', 400)
    }

    if (!invitation) {
      // Generic error — do not reveal what specifically failed (anti-enumeration)
      return err('Invalid invitation code', 400)
    }

    const elderlyProfileId = invitation.elderly_profile_id

    // Invitation codes are bound to the verified account email.
    if (!user.email || invitation.invited_email.toLowerCase() !== user.email.toLowerCase()) {
      return err('This invitation was issued to a different email address', 403)
    }

    // Increment attempt_count on every successful code lookup (brute-force protection)
    const newAttemptCount = (invitation.attempt_count || 0) + 1
    await serviceClient
      .from('invitations')
      .update({ attempt_count: newAttemptCount })
      .eq('id', invitation.id)

    // Validate invitation state (use updated count for the check)
    if (newAttemptCount > 10) {
      return err('This invitation has been invalidated due to too many failed attempts', 400)
    }

    if (invitation.consumed_at) {
      return err('This invitation has already been used', 400)
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return err('This invitation has expired', 400)
    }

    // Check if an active relationship already exists
    const { data: existingRel } = await serviceClient
      .from('care_relationships')
      .select('id')
      .eq('elderly_profile_id', elderlyProfileId)
      .eq('caregiver_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingRel) {
      // Consume the invitation anyway to prevent re-use
      await serviceClient
        .from('invitations')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', invitation.id)
      return ok({ message: 'You already have an active relationship with this care circle' })
    }

    // Atomically consume the invitation (optimistic lock — only succeeds if still unconsumed)
    const { data: consumedInvitation, error: consumeError } = await serviceClient
      .from('invitations')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', invitation.id)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('id')
      .maybeSingle()

    if (consumeError || !consumedInvitation) {
      return err('Invitation could not be consumed. It may have expired or already been used.', 409)
    }

    // Create the care relationship
    const { data: relationship, error: relError } = await serviceClient
      .from('care_relationships')
      .insert({
        elderly_profile_id: elderlyProfileId,
        caregiver_user_id: user.id,
        relationship_type: invitation.role,
        permissions: invitation.permissions,
        status: 'active',
      })
      .select()
      .single()

    if (relError) {
      console.error('Create relationship error:', relError)
      return err('Failed to create care relationship', 500)
    }

    // The invitation issuer determines the account's caregiver role.
    const { error: roleError } = await serviceClient
      .from('profiles')
      .update({ role: invitation.role })
      .eq('id', user.id)
    if (roleError) {
      console.error('Profile role update failed:', roleError)
      // Keep the relationship valid; role is not used as the access-control boundary.
    }

    // Audit log (direct insert — accept-invitation uses service role throughout)
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'accept_invitation',
      resource_type: 'care_relationship',
      resource_id: relationship.id,
      metadata: { invitation_id: invitation.id, role: invitation.role },
    })

    return ok({ relationship, elderly_profile_id: elderlyProfileId, role: invitation.role, message: 'Successfully joined the care circle' })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('Unexpected error:', e)
    return err('Internal server error', 500)
  }
})
