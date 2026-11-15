import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppointmentCard } from '@/features/appointments/AppointmentCard'
import { AppointmentForm, type AppointmentFormData } from '@/features/appointments/AppointmentForm'
import { useAuth } from '@/hooks/useAuth'
import { useAppointments } from '@/hooks/useAppointments'
import { createAppointment, cancelAppointment, updateAppointment } from '@/services/appointments'
import { toast } from '@/components/ui/use-toast'

export function AppointmentsPage() {
  const { currentElderlyId, user } = useAuth()
  const { appointments, isLoading, refetch } = useAppointments(currentElderlyId)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled')
  const pastAppointments = appointments.filter((a) => a.status !== 'scheduled')

  const handleCreateAppointment = async (data: AppointmentFormData) => {
    if (!currentElderlyId || !user) {
      toast({
        title: 'Error',
        description: 'Profile not identified. Please refresh.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createAppointment({
        elderly_profile_id: currentElderlyId,
        doctor_name: data.doctor_name,
        hospital_name: data.hospital_name || undefined,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        timezone: data.timezone,
        purpose: data.purpose || undefined,
        notes: data.notes || undefined,
        status: 'scheduled',
        created_by: user.id,
      })

      toast({
        title: 'Appointment Scheduled',
        description: `Visit with ${data.doctor_name} has been added.`,
      })
      setIsAddOpen(false)
      refetch()
    } catch (err) {
      toast({
        title: 'Failed to schedule',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointment(id)
      toast({
        title: 'Appointment Cancelled',
        description: 'The visit has been marked as cancelled.',
      })
      refetch()
    } catch (err) {
      toast({
        title: 'Failed to cancel',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleCompleteAppointment = async (id: string) => {
    try {
      await updateAppointment(id, { status: 'completed' })
      toast({
        title: 'Appointment Completed',
        description: 'The visit has been recorded as completed.',
      })
      refetch()
    } catch (err) {
      toast({
        title: 'Failed to update',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Appointments"
        description="View and schedule doctor consultations, checkups, and clinic visits."
        action={
          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 bg-primary hover:bg-primary-light text-white min-h-[44px]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Schedule Appointment
          </Button>
        }
      />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full sm:w-[320px] grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past / History</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="rounded-lg border border-border p-12 text-center text-muted-foreground bg-card">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-base font-semibold text-foreground">No upcoming appointments</p>
              <p className="text-sm text-muted-foreground mt-1">
                You have no doctor visits or follow-ups scheduled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onCancel={handleCancelAppointment}
                  onComplete={handleCompleteAppointment}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : pastAppointments.length === 0 ? (
            <div className="rounded-lg border border-border p-12 text-center text-muted-foreground bg-card">
              <p className="text-base font-semibold text-foreground">No past appointments</p>
              <p className="text-sm text-muted-foreground mt-1">Historical appointments will be saved here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastAppointments.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} canManage={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Medical Appointment</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            onSubmit={handleCreateAppointment}
            onCancel={() => setIsAddOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AppointmentsPage
