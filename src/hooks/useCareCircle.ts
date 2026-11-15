import { useState, useEffect, useCallback } from 'react'
import {
  getCareRelationships,
  getActiveInvitations,
  revokeCareRelationship,
  type CaregiverWithProfile,
  type InvitationRecord,
} from '@/services/careCircle'

export function useCareCircle(elderlyProfileId?: string | null) {
  const [caregivers, setCaregivers] = useState<CaregiverWithProfile[]>([])
  const [invitations, setInvitations] = useState<InvitationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!elderlyProfileId) {
      setCaregivers([])
      setInvitations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [caregiversData, invitationsData] = await Promise.all([
        getCareRelationships(elderlyProfileId),
        getActiveInvitations(elderlyProfileId),
      ])
      setCaregivers(caregiversData)
      setInvitations(invitationsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch care circle data')
    } finally {
      setIsLoading(false)
    }
  }, [elderlyProfileId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const revoke = async (relationshipId: string) => {
    await revokeCareRelationship(relationshipId)
    setCaregivers((prev) => prev.filter((c) => c.id !== relationshipId))
  }

  return {
    caregivers,
    invitations,
    isLoading,
    error,
    refetch: fetchData,
    revoke,
  }
}
