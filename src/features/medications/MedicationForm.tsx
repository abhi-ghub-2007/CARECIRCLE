import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseScheduleText } from '@/utils/scheduleParser'
import type { MedicationFrequency } from '@/types'

const medicationSchema = z.object({
  medicine_name: z.string().min(1, 'Medicine name is required').max(255),
  dosage_instructions: z.string().min(1, 'Dosage instructions are required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  frequency: z.enum(['daily', 'twice_daily', 'three_times_daily', 'weekly', 'as_needed', 'custom']),
  schedules: z.array(
    z.object({
      scheduled_time: z.string().min(1, 'Scheduled time is required'),
    })
  ).min(1, 'At least one scheduled time is required'),
})

export type MedicationFormData = z.infer<typeof medicationSchema>

interface MedicationFormProps {
  initialValues?: Partial<MedicationFormData>
  onSubmit: (data: MedicationFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function MedicationForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MedicationFormProps) {
  const [naturalInput, setNaturalInput] = useState('')
  const [naturalParsed, setNaturalParsed] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      medicine_name: initialValues?.medicine_name || '',
      dosage_instructions: initialValues?.dosage_instructions || '',
      start_date: initialValues?.start_date || new Date().toISOString().split('T')[0],
      end_date: initialValues?.end_date || '',
      notes: initialValues?.notes || '',
      frequency: initialValues?.frequency || 'daily',
      schedules: initialValues?.schedules?.length ? initialValues.schedules : [{ scheduled_time: '08:00' }],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'schedules',
  })

  const currentFrequency = watch('frequency')

  const handleFrequencyChange = (freq: MedicationFrequency) => {
    setValue('frequency', freq)
    if (freq === 'daily') {
      replace([{ scheduled_time: '08:00' }])
    } else if (freq === 'twice_daily') {
      replace([{ scheduled_time: '08:00' }, { scheduled_time: '20:00' }])
    } else if (freq === 'three_times_daily') {
      replace([{ scheduled_time: '08:00' }, { scheduled_time: '14:00' }, { scheduled_time: '20:00' }])
    }
  }

  const handleParseNatural = () => {
    if (!naturalInput.trim()) return
    const parsed = parseScheduleText(naturalInput)
    setValue('frequency', parsed.frequency)
    if (parsed.instructions) {
      setValue('dosage_instructions', parsed.instructions)
    }
    const newSchedules = parsed.times.map((t) => ({ scheduled_time: t }))
    replace(newSchedules.length > 0 ? newSchedules : [{ scheduled_time: '08:00' }])
    setNaturalParsed(true)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* AI Schedule Parser assistant banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>Quick Schedule Assistant</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Type instructions like "Take twice daily at 9am and 9pm after meals" to auto-fill times.
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. 1 tablet every morning with breakfast"
            value={naturalInput}
            onChange={(e) => {
              setNaturalInput(e.target.value)
              setNaturalParsed(false)
            }}
            aria-label="Natural language schedule description"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleParseNatural}
            disabled={!naturalInput.trim()}
            className="shrink-0"
          >
            Parse
          </Button>
        </div>
        {naturalParsed && (
          <p className="text-xs text-green-700 font-medium" role="status">
            Schedule parsed and applied below!
          </p>
        )}
      </div>

      {/* Medicine Name */}
      <Input
        label="Medicine Name"
        id="medicine_name"
        placeholder="e.g. Lisinopril, Metformin"
        required
        error={errors.medicine_name?.message}
        {...register('medicine_name')}
      />

      {/* Dosage Instructions */}
      <Input
        label="Dosage Instructions"
        id="dosage_instructions"
        placeholder="e.g. 10mg - 1 tablet with a glass of water"
        required
        error={errors.dosage_instructions?.message}
        {...register('dosage_instructions')}
      />

      {/* Frequency selector */}
      <div className="space-y-1.5">
        <label htmlFor="frequency" className="block text-sm font-medium text-foreground">
          Frequency <span className="text-destructive">*</span>
        </label>
        <select
          id="frequency"
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          value={currentFrequency}
          onChange={(e) => handleFrequencyChange(e.target.value as MedicationFrequency)}
        >
          <option value="daily">Once Daily</option>
          <option value="twice_daily">Twice Daily</option>
          <option value="three_times_daily">Three Times Daily</option>
          <option value="weekly">Weekly</option>
          <option value="as_needed">As Needed (PRN)</option>
          <option value="custom">Custom Schedule</option>
        </select>
      </div>

      {/* Scheduled Times */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            Scheduled Time(s) <span className="text-destructive">*</span>
          </label>
          {currentFrequency === 'custom' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ scheduled_time: '12:00' })}
              className="gap-1 text-xs"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Add Time
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                type="time"
                id={`schedules_${index}`}
                aria-label={`Dose time #${index + 1}`}
                error={errors.schedules?.[index]?.scheduled_time?.message}
                {...register(`schedules.${index}.scheduled_time`)}
              />
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                  aria-label={`Remove time ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start Date & End Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Start Date"
          id="start_date"
          type="date"
          required
          error={errors.start_date?.message}
          {...register('start_date')}
        />

        <Input
          label="End Date (Optional)"
          id="end_date"
          type="date"
          error={errors.end_date?.message}
          {...register('end_date')}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium text-foreground">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background p-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Prescribed by Dr. Smith for blood pressure"
          {...register('notes')}
        />
      </div>

      {/* Form action buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialValues?.medicine_name ? 'Update Medication' : 'Add Medication'}
        </Button>
      </div>
    </form>
  )
}
