import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlarmClock,
  Clock,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatTime } from '@/lib/utils'
import { getEscalationState } from '@/utils/escalation'
import type { DoseEventWithDetails } from '@/services/medications'
import type { DoseStatus } from '@/types'

interface DoseTrackerProps {
  doses: DoseEventWithDetails[]
  onRecordDose: (doseId: string, status: DoseStatus, notes?: string) => Promise<void>
  canRecord?: boolean
}

export function DoseTracker({
  doses,
  onRecordDose,
  canRecord = true,
}: DoseTrackerProps) {
  const [selectedDoseForSkip, setSelectedDoseForSkip] = useState<DoseEventWithDetails | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStatusChange = async (doseId: string, status: DoseStatus, notes?: string) => {
    setIsSubmitting(true)
    try {
      await onRecordDose(doseId, status, notes)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmSkip = async () => {
    if (!selectedDoseForSkip) return
    setIsSubmitting(true)
    try {
      await onRecordDose(selectedDoseForSkip.id, 'skipped', skipReason)
      setSelectedDoseForSkip(null)
      setSkipReason('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStatusBadge = (status: DoseStatus) => {
    switch (status) {
      case 'taken':
        return (
          <Badge variant="success" className="gap-1 py-1 px-2.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-700" aria-hidden="true" />
            <span>Taken</span>
          </Badge>
        )
      case 'skipped':
        return (
          <Badge variant="outline" className="gap-1 py-1 px-2.5 text-orange-700 border-orange-300 bg-orange-50">
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Skipped</span>
          </Badge>
        )
      case 'missed':
        return (
          <Badge variant="danger" className="gap-1 py-1 px-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
            <span>Missed</span>
          </Badge>
        )
      case 'snoozed':
        return (
          <Badge variant="outline" className="gap-1 py-1 px-2.5 text-purple-700 border-purple-300 bg-purple-50">
            <AlarmClock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Snoozed</span>
          </Badge>
        )
      case 'due':
        return (
          <Badge variant="warning" className="gap-1 py-1 px-2.5">
            <Clock className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
            <span>Due Now</span>
          </Badge>
        )
      case 'unconfirmed':
        return (
          <Badge variant="outline" className="gap-1 py-1 px-2.5 text-gray-700 border-gray-300">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Unconfirmed</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 py-1 px-2.5 text-blue-700 border-blue-300 bg-blue-50">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upcoming</span>
          </Badge>
        )
    }
  }

  if (doses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
          <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
          <p className="text-base font-semibold text-foreground">No medications scheduled for today</p>
          <p className="text-sm text-muted-foreground mt-1">Enjoy your day or add a new medication schedule.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {doses.map((dose) => {
        const escalation = getEscalationState(dose)
        const medName = dose.medication_schedule?.medication?.medicine_name || 'Medication'
        const instructions = dose.medication_schedule?.medication?.dosage_instructions || ''
        const timeStr = dose.scheduled_for ? new Date(dose.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        const isDone = ['taken', 'skipped', 'missed'].includes(dose.status)

        return (
          <Card
            key={dose.id}
            className={`border-l-4 transition-all ${
              escalation.level === 'intervention'
                ? 'border-l-destructive shadow-md bg-destructive/5'
                : escalation.level === 'notify_caregiver'
                ? 'border-l-amber-500 bg-amber-50/30'
                : dose.status === 'taken'
                ? 'border-l-green-600 bg-card'
                : 'border-l-primary bg-card'
            }`}
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{medName}</span>
                  <span className="text-sm font-semibold text-muted-foreground">({timeStr})</span>
                </div>
                {instructions && <p className="text-sm text-foreground/80 mt-1">{instructions}</p>}
              </div>
              <div className="shrink-0">{renderStatusBadge(dose.status)}</div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {/* Escalation warning alert if overdue */}
              {escalation.message && (
                <div
                  className="rounded-md bg-amber-100 p-2.5 text-xs text-amber-900 font-medium flex items-center gap-2"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>{escalation.message}</span>
                </div>
              )}

              {/* Action Buttons for elderly / caregiver */}
              {canRecord && !isDone && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="min-h-[44px] bg-primary hover:bg-primary-light text-white font-semibold px-4 flex-1 sm:flex-none"
                    onClick={() => handleStatusChange(dose.id, 'taken')}
                    disabled={isSubmitting}
                    aria-label={`Mark ${medName} taken`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    Mark Taken
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] border-border text-foreground hover:bg-muted px-4"
                    onClick={() => handleStatusChange(dose.id, 'snoozed', 'Snoozed 30 mins')}
                    disabled={isSubmitting}
                    aria-label={`Snooze ${medName} reminder`}
                  >
                    <AlarmClock className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    Snooze (30m)
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] text-destructive hover:bg-destructive/10 px-4"
                    onClick={() => setSelectedDoseForSkip(dose)}
                    disabled={isSubmitting}
                    aria-label={`Skip ${medName}`}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    Skip Dose
                  </Button>
                </div>
              )}

              {isDone && dose.acknowledged_at && (
                <p className="text-xs text-muted-foreground pt-1 border-t border-border/60">
                  Recorded on {new Date(dose.acknowledged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {dose.notes ? ` • Note: ${dose.notes}` : ''}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Skip Confirmation Dialog */}
      <Dialog open={!!selectedDoseForSkip} onOpenChange={(open) => !open && setSelectedDoseForSkip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Medication Dose</DialogTitle>
            <DialogDescription>
              Are you sure you want to skip this dose of{' '}
              <span className="font-semibold text-foreground">
                {selectedDoseForSkip?.medication_schedule?.medication?.medicine_name}
              </span>
              ? Your care circle will be informed if necessary.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label htmlFor="skip-reason" className="block text-sm font-medium text-foreground">
              Reason for skipping (Optional)
            </label>
            <input
              id="skip-reason"
              type="text"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Mild nausea, doctor advised"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedDoseForSkip(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmSkip}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Confirm Skip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
