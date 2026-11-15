import { Pill, Clock, Edit2, Ban, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/utils'
import type { MedicationWithSchedules } from '@/services/medications'

interface MedicationCardProps {
  medication: MedicationWithSchedules
  onEdit?: (medication: MedicationWithSchedules) => void
  onDeactivate?: (id: string) => void
  canManage?: boolean
}

export function MedicationCard({
  medication,
  onEdit,
  onDeactivate,
  canManage = true,
}: MedicationCardProps) {
  const isActive = medication.status === 'active'
  const schedules = medication.medication_schedules || []

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Pill className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{medication.medicine_name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Started {medication.start_date}
                {medication.end_date ? ` • Until ${medication.end_date}` : ''}
              </p>
            </div>
          </div>

          <Badge variant={isActive ? 'success' : 'outline'}>
            {isActive ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" aria-hidden="true" /> Active
              </span>
            ) : (
              'Inactive'
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instructions</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{medication.dosage_instructions}</p>
        </div>

        {schedules.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {schedules.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-foreground"
                >
                  <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {formatTime(s.scheduled_time)}
                </span>
              ))}
            </div>
          </div>
        )}

        {medication.notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-2">
            "{medication.notes}"
          </p>
        )}
      </CardContent>

      {canManage && (
        <CardFooter className="pt-2 border-t border-border/60 flex justify-end gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(medication)}
              className="gap-1.5 text-xs min-h-[38px]"
              aria-label={`Edit ${medication.medicine_name}`}
            >
              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          )}
          {isActive && onDeactivate && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDeactivate(medication.id)}
              className="gap-1.5 text-xs min-h-[38px]"
              aria-label={`Deactivate ${medication.medicine_name}`}
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              Deactivate
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
