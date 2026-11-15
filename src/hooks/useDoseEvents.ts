import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTodayDoseEvents, type DoseEventWithDetails } from '@/services/medications'

export function useDoseEvents(elderlyProfileId?: string | null) {
  const [doseEvents, setDoseEvents] = useState<DoseEventWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDoses = useCallback(async () => {
    if (!elderlyProfileId) {
      setDoseEvents([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await getTodayDoseEvents(elderlyProfileId)
      setDoseEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dose events')
    } finally {
      setIsLoading(false)
    }
  }, [elderlyProfileId])

  useEffect(() => {
    fetchDoses()

    if (!elderlyProfileId) return

    // Realtime subscription on dose_events
    const channel = supabase
      .channel(`dose_events:${elderlyProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dose_events',
        },
        () => {
          fetchDoses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [elderlyProfileId, fetchDoses])

  const updateLocalDose = (id: string, updates: Partial<DoseEventWithDetails>) => {
    setDoseEvents((prev) =>
      prev.map((dose) => (dose.id === id ? { ...dose, ...updates } : dose))
    )
  }

  return { doseEvents, isLoading, error, refetch: fetchDoses, updateLocalDose }
}
