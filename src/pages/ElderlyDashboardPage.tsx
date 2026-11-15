import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Pill,
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DoseTracker } from '@/features/medications/DoseTracker'
import { AppointmentCard } from '@/features/appointments/AppointmentCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppointmentForm, type AppointmentFormData } from '@/features/appointments/AppointmentForm'
import { useAuth } from '@/hooks/useAuth'
import { useDoseEvents } from '@/hooks/useDoseEvents'
import { useAppointments } from '@/hooks/useAppointments'
import { recordDose } from '@/services/medications'
import { createAppointment } from '@/services/appointments'
import { formatTime, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import type { DoseStatus } from '@/types'

export function ElderlyDashboardPage() {
  const { profile, elderlyProfile, user } = useAuth()
  const elderlyId = elderlyProfile?.id

  const { doseEvents, refetch: refetchDoses, updateLocalDose } = useDoseEvents(elderlyId)
  const { appointments, refetch: refetchAppts } = useAppointments(elderlyId, 'scheduled')

  const [isApptModalOpen, setIsApptModalOpen] = useState(false)
  const [isSubmittingAppt, setIsSubmittingAppt] = useState(false)

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Next medication due
  const upcomingDoses = doseEvents.filter((d) => d.status === 'upcoming' || d.status === 'due')
  const nextDose = upcomingDoses[0]

  const upcomingAppointments = appointments.slice(0, 3)

  const handleRecordDose = async (doseId: string, status: DoseStatus, notes?: string) => {
    updateLocalDose(doseId, {
      status,
      acknowledged_at: new Date().toISOString(),
      notes,
    })

    try {
      await recordDose(doseId, status, notes, user?.id)
      toast({
        title: 'Dose Recorded',
        description: `Successfully marked as ${status}.`,
      })
    } catch (err) {
      refetchDoses()
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to record dose',
        variant: 'destructive',
      })
    }
  }

  const handleCreateAppointment = async (data: AppointmentFormData) => {
    if (!elderlyId || !user) return
    setIsSubmittingAppt(true)
    try {
      await createAppointment({
        elderly_profile_id: elderlyId,
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
        description: `Appointment with ${data.doctor_name} was saved.`,
      })
      setIsApptModalOpen(false)
      refetchAppts()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to schedule',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingAppt(false)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Elderly-first high contrast greeting header with large touch targets */}
      <section className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Friend'}!
            </h1>
            <p className="text-white/90 text-base sm:text-lg mt-1 font-medium">
              Here is your daily health schedule for today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/medications">
              <Button
                type="button"
                className="bg-white text-primary hover:bg-white/90 font-bold min-h-[48px] px-5 text-base shadow"
              >
                <Pill className="h-5 w-5 mr-2" aria-hidden="true" />
                Record Dose
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApptModalOpen(true)}
              className="bg-primary-dark/40 text-white border-white/30 hover:bg-primary-dark/60 font-semibold min-h-[48px] px-5 text-base"
            >
              <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
              Add Appointment
            </Button>
          </div>
        </div>
      </section>

      {/* Next Medication Due Highlight Banner */}
      {nextDose && (
        <section aria-label="Next Medication Reminder" className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                <Clock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Next Medication Due</span>
                <h2 className="text-xl font-extrabold text-foreground">
                  {nextDose.medication_schedule?.medication?.medicine_name} — {formatTime(nextDose.medication_schedule?.scheduled_time || '08:00')}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {nextDose.medication_schedule?.medication?.dosage_instructions}
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="w-full sm:w-auto min-h-[48px] px-6 text-base font-bold bg-primary hover:bg-primary-light"
              onClick={() => handleRecordDose(nextDose.id, 'taken')}
            >
              <CheckCircle className="h-5 w-5 mr-2" aria-hidden="true" />
              Take Now
            </Button>
          </div>
        </section>
      )}

      {/* Main Grid: Today's Meds & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Today's Medications */}
        <section className="lg:col-span-2 space-y-4" aria-labelledby="today-meds-heading">
          <div className="flex items-center justify-between">
            <h2 id="today-meds-heading" className="text-xl font-bold text-foreground flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" aria-hidden="true" />
              Today's Medications ({doseEvents.length})
            </h2>
            <Link
              to="/medications"
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <DoseTracker doses={doseEvents} onRecordDose={handleRecordDose} />
        </section>

        {/* Right 1 Col: Upcoming Appointments & Care Info */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <section aria-labelledby="upcoming-appts-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="upcoming-appts-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-secondary" aria-hidden="true" />
                Upcoming Visits
              </h2>
              <Link
                to="/appointments"
                className="text-xs font-semibold text-primary hover:underline"
              >
                See calendar
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p className="text-sm font-medium">No upcoming visits</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setIsApptModalOpen(true)}
                    className="mt-2 text-xs"
                  >
                    + Schedule doctor visit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} canManage={false} />
                ))}
              </div>
            )}
          </section>

          {/* Quick Emergency / Care Circle Link */}
          <Card className="bg-muted/40 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                Care Circle Support
              </CardTitle>
              <CardDescription className="text-xs">
                Your family and caregivers are connected to help support your care.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/care-circle">
                <Button variant="outline" size="sm" className="w-full text-xs min-h-[40px] mt-2">
                  View Care Circle Members
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Modal */}
      <Dialog open={isApptModalOpen} onOpenChange={setIsApptModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Doctor Appointment</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            onSubmit={handleCreateAppointment}
            onCancel={() => setIsApptModalOpen(false)}
            isSubmitting={isSubmittingAppt}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ElderlyDashboardPage
