import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, addMinutes, parseISO } from 'date-fns'
import { DOSE_STATUS_CONFIG, ESCALATION } from './constants'
import type { DoseStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return format(typeof date === 'string' ? parseISO(date) : date, 'MMMM d, yyyy')
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM d, yyyy h:mm a')
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function getDoseStatusConfig(status: DoseStatus) {
  return DOSE_STATUS_CONFIG[status]
}

export function getDoseStatusLabel(status: DoseStatus): string {
  return DOSE_STATUS_CONFIG[status].label
}

export function getDoseStatusColorClass(status: DoseStatus): string {
  return DOSE_STATUS_CONFIG[status].color
}

export function isOverdue(scheduledFor: string, graceMinutes: number = ESCALATION.WARNING_MINUTES): boolean {
  const scheduled = parseISO(scheduledFor)
  const graceEnd = addMinutes(scheduled, graceMinutes)
  return isAfter(new Date(), graceEnd)
}

export function getGracePeriodEnd(scheduledFor: string, minutes: number): Date {
  return addMinutes(parseISO(scheduledFor), minutes)
}

export function shouldEscalate(scheduledFor: string): 'warning' | 'notify' | 'intervene' | null {
  const now = new Date()
  const scheduled = parseISO(scheduledFor)
  if (isAfter(now, addMinutes(scheduled, ESCALATION.INTERVENTION_MINUTES))) return 'intervene'
  if (isAfter(now, addMinutes(scheduled, ESCALATION.CAREGIVER_NOTIFY_MINUTES))) return 'notify'
  if (isAfter(now, addMinutes(scheduled, ESCALATION.WARNING_MINUTES))) return 'warning'
  return null
}

export function generateAdherenceSummary(events: Array<{ status: string }>): string {
  const counts = { taken: 0, skipped: 0, missed: 0, unconfirmed: 0 }
  events.forEach(e => {
    if (e.status in counts) counts[e.status as keyof typeof counts]++
  })
  const parts: string[] = []
  if (counts.taken > 0) parts.push(`${counts.taken} taken`)
  if (counts.missed > 0) parts.push(`${counts.missed} missed`)
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`)
  if (counts.unconfirmed > 0) parts.push(`${counts.unconfirmed} unconfirmed`)
  return parts.length > 0 ? parts.join(', ') : 'No medication events recorded'
}

export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str
}
