import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowRight, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'

export function AcceptInvitationPage() {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [joinedCircle, setJoinedCircle] = useState<{ role: string } | null>(null)
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.invitations.accept({ code: code.trim() })
      setJoinedCircle({ role: res?.role || 'caregiver' })
      await refreshProfile()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invitation could not be verified. Please check the code and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <span className="text-2xl font-semibold text-foreground">CareCircle</span>
          </div>
          <p className="text-muted-foreground">Join a loved one's Care Circle</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
          {!joinedCircle ? (
            <>
              <h1 className="text-2xl font-bold mb-2 text-foreground">Accept Invitation</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the 64-character invitation code shared by the individual or primary caregiver.
              </p>

              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Invitation Code"
                  id="invitation_code"
                  placeholder="Paste your 64-character invitation code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  className="font-mono text-center tracking-widest text-lg uppercase"
                />

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary-light"
                  disabled={isLoading || !code.trim()}
                  aria-busy={isLoading}
                >
                  {isLoading ? 'Verifying Code...' : 'Join Care Circle'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-700">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Welcome to the Care Circle!</h2>
              <p className="text-sm text-muted-foreground">
                You have successfully joined as a{' '}
                <span className="font-semibold text-foreground capitalize">{joinedCircle.role}</span>. You can now view
                medication schedules, appointments, and support daily care.
              </p>
              <Button
                type="button"
                className="w-full h-11 gap-2 mt-4"
                onClick={() => navigate('/dashboard')}
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default AcceptInvitationPage
