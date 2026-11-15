export const DOSE_STATUS = {
  UPCOMING: 'upcoming',
  DUE: 'due',
  TAKEN: 'taken',
  SKIPPED: 'skipped',
  MISSED: 'missed',
  SNOOZED: 'snoozed',
  UNCONFIRMED: 'unconfirmed',
} as const

export const ESCALATION = {
  WARNING_MINUTES: 15,
  CAREGIVER_NOTIFY_MINUTES: 30,
  INTERVENTION_MINUTES: 60,
} as const

export const INVITATION = {
  EXPIRY_HOURS: 48,
  MAX_ATTEMPTS: 5,
  CODE_LENGTH: 32,
} as const

export const PERMISSIONS = [
  'view_medications',
  'manage_medications',
  'view_appointments',
  'manage_appointments',
  'record_doses',
  'view_adherence',
  'receive_notifications',
] as const

export const DEFAULT_FAMILY_PERMISSIONS = [
  'view_medications',
  'view_appointments',
  'view_adherence',
  'receive_notifications',
]

export const DEFAULT_CARETAKER_PERMISSIONS = [
  'view_medications',
  'view_appointments',
  'record_doses',
  'view_adherence',
  'receive_notifications',
]

export const NOTIFICATION_TYPES = {
  UPCOMING_MEDICATION: 'upcoming_medication',
  UNCONFIRMED_MEDICATION: 'unconfirmed_medication',
  MISSED_MEDICATION: 'missed_medication',
  UPCOMING_APPOINTMENT: 'upcoming_appointment',
  INVITATION: 'invitation',
  CAREGIVER_INTERVENTION: 'caregiver_intervention',
} as const

export const DOSE_STATUS_CONFIG = {
  upcoming: { label: 'Upcoming', color: 'text-blue-700 bg-blue-50', icon: 'Clock' },
  due: { label: 'Due Now', color: 'text-amber-700 bg-amber-50', icon: 'AlertCircle' },
  taken: { label: 'Taken', color: 'text-green-700 bg-green-50', icon: 'CheckCircle' },
  skipped: { label: 'Skipped', color: 'text-orange-700 bg-orange-50', icon: 'XCircle' },
  missed: { label: 'Missed', color: 'text-red-700 bg-red-50', icon: 'AlertTriangle' },
  snoozed: { label: 'Snoozed', color: 'text-purple-700 bg-purple-50', icon: 'AlarmClock' },
  unconfirmed: { label: 'Unconfirmed', color: 'text-gray-700 bg-gray-50', icon: 'HelpCircle' },
} as const
