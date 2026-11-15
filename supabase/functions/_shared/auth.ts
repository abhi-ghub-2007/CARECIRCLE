import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
}

export async function requireAuth(req: Request): Promise<{ user: AuthenticatedUser; supabase: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')

  // Create a client with the user's JWT to enforce RLS
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get profile with role from DB (never trust JWT claims for role)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Response(JSON.stringify({ error: 'Profile not found' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return {
    user: { id: user.id, email: user.email!, role: profile.role },
    supabase,
  }
}

// Service role client for privileged operations (cron jobs, invitation acceptance)
export function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, serviceRoleKey)
}
