import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAdherenceSummary } from '@/services/medications'
import type { AdherenceSummary as AdherenceData } from '@/types'

interface AdherenceSummaryProps {
  elderlyProfileId: string
  daysBack?: number
}

export function AdherenceSummary({ elderlyProfileId, daysBack = 7 }: AdherenceSummaryProps) {
  const [data, setData] = useState<AdherenceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true)
      try {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - daysBack)

        const summary = await getAdherenceSummary(
          elderlyProfileId,
          start.toISOString(),
          end.toISOString()
        )
        setData(summary)
      } catch (err) {
        console.error('Failed to load adherence summary:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (elderlyProfileId) {
      loadSummary()
    }
  }, [elderlyProfileId, daysBack])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.total_scheduled === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            Medication Adherence (Past {daysBack} Days)
          </CardTitle>
          <CardDescription>Adherence metrics are calculated from recorded doses</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No medication doses recorded in this period.</p>
        </CardContent>
      </Card>
    )
  }

  const takenPct = Math.round((data.taken / data.total_scheduled) * 100)
  const missedPct = Math.round((data.missed / data.total_scheduled) * 100)
  const skippedPct = Math.round((data.skipped / data.total_scheduled) * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
              Medication Adherence
            </CardTitle>
            <CardDescription>Past {daysBack} days summary</CardDescription>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">{data.adherence_percentage}%</span>
            <p className="text-xs text-muted-foreground">Adherence Rate</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar with segment labels */}
        <div
          className="h-4 w-full bg-muted rounded-full overflow-hidden flex"
          role="progressbar"
          aria-valuenow={data.adherence_percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall adherence ${data.adherence_percentage} percent`}
        >
          {takenPct > 0 && <div style={{ width: `${takenPct}%` }} className="bg-primary h-full transition-all" />}
          {skippedPct > 0 && <div style={{ width: `${skippedPct}%` }} className="bg-amber-500 h-full transition-all" />}
          {missedPct > 0 && <div style={{ width: `${missedPct}%` }} className="bg-destructive h-full transition-all" />}
        </div>

        {/* Breakdown items with explicit text and icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-md border border-border p-3 flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Taken</p>
              <p className="text-base font-bold text-foreground">{data.taken} doses</p>
            </div>
          </div>

          <div className="rounded-md border border-border p-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Missed</p>
              <p className="text-base font-bold text-foreground">{data.missed} doses</p>
            </div>
          </div>

          <div className="rounded-md border border-border p-3 flex items-center gap-2.5">
            <XCircle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-base font-bold text-foreground">{data.skipped} doses</p>
            </div>
          </div>

          <div className="rounded-md border border-border p-3 flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Unconfirmed</p>
              <p className="text-base font-bold text-foreground">{data.unconfirmed} doses</p>
            </div>
          </div>
        </div>

        {/* Clear non-color-only text summary */}
        <div className="rounded-md bg-muted/60 p-3 text-xs sm:text-sm text-foreground">
          <strong>Summary: </strong>
          {data.missed === 0
            ? 'Excellent! No doses were missed during this period.'
            : `${data.missed} dose${data.missed === 1 ? '' : 's'} missed this period. Caregiver check-in recommended.`}
        </div>
      </CardContent>
    </Card>
  )
}
