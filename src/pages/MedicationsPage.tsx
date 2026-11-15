import { useState } from 'react'
import { Plus, Filter, Pill } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MedicationCard } from '@/features/medications/MedicationCard'
import { MedicationForm, type MedicationFormData } from '@/features/medications/MedicationForm'
import { DoseTracker } from '@/features/medications/DoseTracker'
import { AdherenceSummary } from '@/features/medications/AdherenceSummary'
import { useAuth } from '@/hooks/useAuth'
import { useMedications } from '@/hooks/useMedications'
import { useDoseEvents } from '@/hooks/useDoseEvents'
import { createMedication, deactivateMedication, recordDose } from '@/services/medications'
import { toast } from '@/components/ui/use-toast'
import type { DoseStatus } from '@/types'

export function MedicationsPage() {
  const { currentElderlyId, user } = useAuth()
  const { medications, isLoading: isMedsLoading, refetch: refetchMeds } = useMedications(currentElderlyId)
  const { doseEvents, refetch: refetchDoses, updateLocalDose } = useDoseEvents(currentElderlyId)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredMeds = medications.filter((m) => {
    if (statusFilter === 'all') return true
    return m.status === statusFilter
  })

  const handleCreateMedication = async (data: MedicationFormData) => {
    if (!currentElderlyId || !user) {
      toast({
        title: 'Error',
        description: 'Unable to identify profile. Please refresh.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createMedication(
        {
          elderly_profile_id: currentElderlyId,
          medicine_name: data.medicine_name,
          dosage_instructions: data.dosage_instructions,
          start_date: data.start_date,
          end_date: data.end_date || undefined,
          notes: data.notes || undefined,
          created_by: user.id,
        },
        data.schedules.map((s) => ({
          scheduled_time: s.scheduled_time,
          frequency: data.frequency,
        }))
      )

      toast({
        title: 'Medication added',
        description: `${data.medicine_name} was successfully registered.`,
      })
      setIsAddOpen(false)
      refetchMeds()
      refetchDoses()
    } catch (err) {
      toast({
        title: 'Failed to add medication',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateMedication(id)
      toast({
        title: 'Medication deactivated',
        description: 'The medication has been marked inactive.',
      })
      refetchMeds()
    } catch (err) {
      toast({
        title: 'Failed to deactivate',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleRecordDose = async (doseId: string, status: DoseStatus, notes?: string) => {
    // Optimistic update
    updateLocalDose(doseId, {
      status,
      acknowledged_at: new Date().toISOString(),
      notes,
    })

    try {
      await recordDose(doseId, status, notes, user?.id)
      toast({
        title: 'Dose recorded',
        description: `Status updated to ${status}.`,
      })
    } catch (err) {
      refetchDoses()
      toast({
        title: 'Error recording dose',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Medications & Doses"
        description="Manage your prescriptions, track today's scheduled doses, and monitor adherence."
        action={
          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 bg-primary hover:bg-primary-light text-white min-h-[44px]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Medication
          </Button>
        }
      />

      {/* Tabs: Today's Doses vs All Medications vs Adherence */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full sm:w-[480px] grid-cols-3">
          <TabsTrigger value="today">Today's Doses</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="adherence">Adherence</TabsTrigger>
        </TabsList>

        {/* Tab 1: Today's Doses */}
        <TabsContent value="today" className="space-y-4 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Today's Dose Schedule</h2>
          <DoseTracker doses={doseEvents} onRecordDose={handleRecordDose} />
        </TabsContent>

        {/* Tab 2: Prescriptions List */}
        <TabsContent value="prescriptions" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
            <h2 className="text-lg font-semibold text-foreground">Registered Medications</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="med-filter" className="sr-only">Filter medications by status</label>
              <select
                id="med-filter"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="all">All Medications</option>
              </select>
            </div>
          </div>

          {isMedsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="rounded-lg border border-border p-12 text-center text-muted-foreground bg-card">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-base font-semibold text-foreground">No medications found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === 'active'
                  ? 'No active medications registered. Click Add Medication to get started.'
                  : 'No medications match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeds.map((med) => (
                <MedicationCard
                  key={med.id}
                  medication={med}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Adherence */}
        <TabsContent value="adherence" className="space-y-4 pt-4">
          {currentElderlyId ? (
            <AdherenceSummary elderlyProfileId={currentElderlyId} daysBack={14} />
          ) : (
            <p className="text-sm text-muted-foreground">Select a profile to view adherence.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Medication Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Medication</DialogTitle>
          </DialogHeader>
          <MedicationForm
            onSubmit={handleCreateMedication}
            onCancel={() => setIsAddOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default MedicationsPage
