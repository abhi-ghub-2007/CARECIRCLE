import { supabase } from '@/lib/supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${FUNCTION_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  })

  let result: Record<string, unknown>
  try {
    result = await response.json()
  } catch {
    throw new Error(`Failed to parse response from ${name}`)
  }

  if (!response.ok) {
    const errorMsg = typeof result?.error === 'string' ? result.error : (result?.message as string) || 'API error'
    throw new Error(errorMsg)
  }

  return (result.data !== undefined ? result.data : result) as T
}

export const api = {
  invitations: {
    create: (data: { invited_email: string; role: string; permissions?: string[]; elderly_profile_id?: string }) =>
      callFunction<{ code: string; expires_at: string }>('create-invitation', data),
    accept: (data: { code: string }) =>
      callFunction<{ elderly_profile_id: string; role: string }>('accept-invitation', data),
  },
  medications: {
    list: (elderlyProfileId: string) =>
      callFunction('manage-medication', { action: 'list', elderly_profile_id: elderlyProfileId }),
    create: (data: unknown) =>
      callFunction('manage-medication', { action: 'create', ...(typeof data === 'object' && data !== null ? data : {}) }),
    update: (id: string, data: unknown) =>
      callFunction('manage-medication', { action: 'update', id, ...(typeof data === 'object' && data !== null ? data : {}) }),
    deactivate: (id: string) =>
      callFunction('manage-medication', { action: 'deactivate', id }),
  },
  doses: {
    record: (data: { dose_event_id?: string; schedule_id?: string; status: string; notes?: string; scheduled_for?: string }) =>
      callFunction('record-dose', data),
    list: (scheduleId: string) =>
      callFunction('record-dose', { action: 'list', schedule_id: scheduleId }),
  },
  appointments: {
    list: (elderlyProfileId: string) =>
      callFunction('manage-appointment', { action: 'list', elderly_profile_id: elderlyProfileId }),
    create: (data: unknown) =>
      callFunction('manage-appointment', { action: 'create', ...(typeof data === 'object' && data !== null ? data : {}) }),
    update: (id: string, data: unknown) =>
      callFunction('manage-appointment', { action: 'update', id, ...(typeof data === 'object' && data !== null ? data : {}) }),
    cancel: (id: string) =>
      callFunction('manage-appointment', { action: 'cancel', id }),
  },
}
