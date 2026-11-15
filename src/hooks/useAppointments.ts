import { useState, useEffect, useCallback } from 'react'
import { getAppointments } from '@/services/appointments'
import type { Appointment, AppointmentStatus } from '@/types'

export function useAppointments(elderlyProfileId?: string | null, statusFilter?: AppointmentStatus) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppts = useCallback(async () => {
    if (!elderlyProfileId) {
      setAppointments([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await getAppointments(elderlyProfileId, statusFilter)
      setAppointments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments')
    } finally {
      setIsLoading(false)
    }
  }, [elderlyProfileId, statusFilter])

  useEffect(() => {
    fetchAppts()
  }, [fetchAppts])

  return { appointments, isLoading, error, refetch: fetchAppts }
}
