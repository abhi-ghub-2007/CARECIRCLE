import { useState, useEffect, useCallback } from 'react'
import { getMedications, type MedicationWithSchedules } from '@/services/medications'

export function useMedications(elderlyProfileId?: string | null) {
  const [medications, setMedications] = useState<MedicationWithSchedules[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeds = useCallback(async () => {
    if (!elderlyProfileId) {
      setMedications([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await getMedications(elderlyProfileId)
      setMedications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch medications')
    } finally {
      setIsLoading(false)
    }
  }, [elderlyProfileId])

  useEffect(() => {
    fetchMeds()
  }, [fetchMeds])

  return { medications, isLoading, error, refetch: fetchMeds }
}
