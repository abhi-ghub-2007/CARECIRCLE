import { Calendar, Clock, MapPin, XCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils'
import type { Appointment } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  onCancel?: (id: string) => void
  onComplete?: (id: string) => void
  canManage?: boolean
}

export function AppointmentCard({
  appointment,
  onCancel,
  onComplete,
  canManage = true,
}: AppointmentCardProps) {
  const isScheduled = appointment.status === 'scheduled'
  const isCompleted = appointment.status === 'completed'
  const isCancelled = appointment.status === 'cancelled'

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-secondary/15 text-secondary-foreground">
              <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{appointment.doctor_name}</CardTitle>
              {appointment.purpose && (
                <p className="text-sm font-medium text-foreground/80 mt-0.5">{appointment.purpose}</p>
              )}
            </div>
          </div>

          <Badge
            variant={
              isScheduled ? 'default' : isCompleted ? 'success' : 'outline'
            }
          >
            {isScheduled ? 'Scheduled' : isCompleted ? 'Completed' : 'Cancelled'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pb-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span>
            {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
          </span>
        </div>

        {appointment.hospital_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{appointment.hospital_name}</span>
          </div>
        )}

        {appointment.notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-2">
            "{appointment.notes}"
          </p>
        )}
      </CardContent>

      {canManage && isScheduled && (
        <CardFooter className="pt-2 border-t border-border/60 flex justify-end gap-2">
          {onComplete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onComplete(appointment.id)}
              className="gap-1.5 text-xs min-h-[38px]"
              aria-label={`Mark appointment with ${appointment.doctor_name} as completed`}
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              Complete
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onCancel(appointment.id)}
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 min-h-[38px]"
              aria-label={`Cancel appointment with ${appointment.doctor_name}`}
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Cancel
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
