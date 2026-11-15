import { parseISO } from 'date-fns'
import type { DoseEvent } from '@/types'

export type EscalationLevel = 'none' | 'warning' | 'notify_caregiver' | 'intervention'

export interface EscalationState {
  level: EscalationLevel
  minutesPastDue: number
  shouldNotifyCaregiver: boolean
  shouldAllowIntervention: boolean
  message: string
}

const GRACE_MINUTES = 15
const NOTIFY_MINUTES = 30
const INTERVENTION_MINUTES = 60

export function getEscalationState(doseEvent: DoseEvent): EscalationState {
  // Terminal states don't escalate
  if (['taken', 'skipped', 'missed'].includes(doseEvent.status)) {
    return {
      level: 'none',
      minutesPastDue: 0,
      shouldNotifyCaregiver: false,
      shouldAllowIntervention: false,
      message: '',
    }
  }

  const scheduledFor = parseISO(doseEvent.scheduled_for)
  const now = new Date()
  const minutesPastDue = Math.max(0, (now.getTime() - scheduledFor.getTime()) / 60000)

  if (minutesPastDue >= INTERVENTION_MINUTES) {
    return {
      level: 'intervention',
      minutesPastDue,
      shouldNotifyCaregiver: true,
      shouldAllowIntervention: true,
      message: `Medication was due ${Math.round(minutesPastDue)} minutes ago. Caregiver intervention may be needed.`,
    }
  }

  if (minutesPastDue >= NOTIFY_MINUTES) {
    return {
      level: 'notify_caregiver',
      minutesPastDue,
      shouldNotifyCaregiver: true,
      shouldAllowIntervention: false,
      message: `Medication is ${Math.round(minutesPastDue)} minutes overdue. Caregiver has been notified.`,
    }
  }

  if (minutesPastDue >= GRACE_MINUTES) {
    return {
      level: 'warning',
      minutesPastDue,
      shouldNotifyCaregiver: false,
      shouldAllowIntervention: false,
      message: `Medication was due ${Math.round(minutesPastDue)} minutes ago.`,
    }
  }

  return {
    level: 'none',
    minutesPastDue,
    shouldNotifyCaregiver: false,
    shouldAllowIntervention: false,
    message: '',
  }
}
