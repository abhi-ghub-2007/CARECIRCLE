import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const appointmentSchema = z.object({
  doctor_name: z.string().min(1, 'Doctor name is required'),
  hospital_name: z.string().optional(),
  appointment_date: z.string().min(1, 'Date is required'),
  appointment_time: z.string().min(1, 'Time is required'),
  timezone: z.string().default('UTC'),
  purpose: z.string().optional(),
  notes: z.string().optional(),
})

export type AppointmentFormData = z.infer<typeof appointmentSchema>

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
]

interface AppointmentFormProps {
  initialValues?: Partial<AppointmentFormData>
  onSubmit: (data: AppointmentFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function AppointmentForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AppointmentFormProps) {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      doctor_name: initialValues?.doctor_name || '',
      hospital_name: initialValues?.hospital_name || '',
      appointment_date: initialValues?.appointment_date || new Date().toISOString().split('T')[0],
      appointment_time: initialValues?.appointment_time || '10:00',
      timezone: initialValues?.timezone || userTimezone,
      purpose: initialValues?.purpose || '',
      notes: initialValues?.notes || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Doctor / Specialist Name"
        id="doctor_name"
        placeholder="e.g. Dr. Sarah Jenkins"
        required
        error={errors.doctor_name?.message}
        {...register('doctor_name')}
      />

      <Input
        label="Hospital / Clinic Name"
        id="hospital_name"
        placeholder="e.g. Memorial Hospital, Suite 402"
        error={errors.hospital_name?.message}
        {...register('hospital_name')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date"
          id="appointment_date"
          type="date"
          required
          error={errors.appointment_date?.message}
          {...register('appointment_date')}
        />

        <Input
          label="Time"
          id="appointment_time"
          type="time"
          required
          error={errors.appointment_time?.message}
          {...register('appointment_time')}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="timezone" className="block text-sm font-medium text-foreground">
          Timezone
        </label>
        <select
          id="timezone"
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('timezone')}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Purpose of Visit"
        id="purpose"
        placeholder="e.g. Annual cardiology checkup, blood work"
        error={errors.purpose?.message}
        {...register('purpose')}
      />

      <div className="space-y-1.5">
        <label htmlFor="appt_notes" className="block text-sm font-medium text-foreground">
          Notes / Preparation
        </label>
        <textarea
          id="appt_notes"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background p-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Fast 12 hours before visit; bring blood pressure log"
          {...register('notes')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialValues?.doctor_name ? 'Update Appointment' : 'Schedule Appointment'}
        </Button>
      </div>
    </form>
  )
}
