import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Pill, Users, ArrowRight, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { getAccessibleElderlyProfiles, type ElderlyWithDetails } from '@/services/careCircle'
import { toast } from '@/components/ui/use-toast'

export default function DashboardPage() {
  const { profile, currentElderlyId, setCurrentElderlyId } = useAuth()
  const [profiles, setProfiles] = useState<ElderlyWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getAccessibleElderlyProfiles(profile?.id || '')
      .then((rows) => {
        if (!active) return
        setProfiles(rows)
        if (!currentElderlyId && rows[0]) setCurrentElderlyId(rows[0].id)
      })
      .catch((error) => {
        if (active) toast({ title: 'Unable to load care profiles', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [profile?.id, currentElderlyId, setCurrentElderlyId])

  const selected = profiles.find((p) => p.id === currentElderlyId)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Caregiver Dashboard</h1>
        <p className="mt-1 text-muted-foreground">A shared view of the people and care routines you support.</p>
      </header>

      {loading ? (
        <div className="rounded-xl border p-8" role="status">Loading your care circles…</div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">No care circles yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ask the elderly individual to invite you using your registered email address.</p>
            <Link to="/accept-invitation"><Button className="mt-4">Accept an invitation</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-labelledby="profiles-heading">
            <h2 id="profiles-heading" className="mb-3 text-lg font-semibold">People you support</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((person) => (
                <button key={person.id} type="button" onClick={() => setCurrentElderlyId(person.id)}
                  aria-pressed={currentElderlyId === person.id}
                  className={`rounded-xl border bg-card p-4 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${currentElderlyId === person.id ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound aria-hidden="true" /></span>
                    <span><span className="block font-semibold">{person.profile?.full_name || 'Care profile'}</span><span className="text-xs capitalize text-muted-foreground">{person.relationship_type || 'caregiver'}</span></span>
                  </div>
                </button>
              ))}
            </div>
          </section>
          {selected && (
            <section className="grid gap-4 sm:grid-cols-3" aria-label="Care actions">
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Pill className="h-4 w-4" /> Medication schedule</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">Review scheduled doses and adherence records.</p><Link to="/medications"><Button variant="outline" className="w-full">Open medications <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" /> Appointments</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">View upcoming doctor visits and appointment history.</p><Link to="/appointments"><Button variant="outline" className="w-full">Open appointments <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Care circle</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">Review your assigned care relationship.</p><Link to="/care-circle"><Button variant="outline" className="w-full">Open care circle <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></CardContent></Card>
            </section>
          )}
        </>
      )}
    </div>
  )
}
