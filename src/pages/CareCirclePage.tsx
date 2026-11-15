import { useState } from 'react'
import { UserPlus, Users, Mail, Clock, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { InviteForm } from '@/features/care-circle/InviteForm'
import { CaregiverCard } from '@/features/care-circle/CaregiverCard'
import { useAuth } from '@/hooks/useAuth'
import { useCareCircle } from '@/hooks/useCareCircle'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

export function CareCirclePage() {
  const { currentElderlyId, profile } = useAuth()
  const { caregivers, invitations, isLoading, refetch, revoke } = useCareCircle(currentElderlyId)

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const isElderly = profile?.role === 'elderly'

  const handleConfirmRevoke = async () => {
    if (!revokingId) return
    try {
      await revoke(revokingId)
      toast({
        title: 'Access Revoked',
        description: 'The caregiver has been removed from this care circle.',
      })
      setRevokingId(null)
    } catch (err) {
      toast({
        title: 'Failed to revoke access',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const copyInvitationToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
    toast({
      title: 'Code Copied',
      description: 'Invitation code copied to clipboard.',
    })
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title="Care Circle"
        description="Collaborate with trusted family members and professional caretakers."
        action={
          isElderly ? (
            <Button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="gap-2 bg-primary hover:bg-primary-light text-white min-h-[44px]"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Invite Caregiver
            </Button>
          ) : undefined
        }
      />

      {/* Active Caregivers Section */}
      <section aria-labelledby="active-caregivers-heading" className="space-y-4">
        <h2 id="active-caregivers-heading" className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          Active Members ({caregivers.length})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : caregivers.length === 0 ? (
          <div className="rounded-lg border border-border p-12 text-center text-muted-foreground bg-card">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" aria-hidden="true" />
            <p className="text-base font-semibold text-foreground">No caregivers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Invite family members or professional caretakers to join your Care Circle.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caregivers.map((rel) => (
              <CaregiverCard
                key={rel.id}
                relationship={rel}
                onRevoke={(id) => setRevokingId(id)}
                canManage={isElderly}
              />
            ))}
          </div>
        )}
      </section>

      {/* Active Invitations Section (visible for elderly) */}
      {isElderly && invitations.length > 0 && (
        <section aria-labelledby="pending-invitations-heading" className="space-y-4 pt-4 border-t border-border">
          <h2 id="pending-invitations-heading" className="text-xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-secondary" aria-hidden="true" />
            Pending Invitations ({invitations.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground truncate">{inv.invited_email}</span>
                    <span className="text-xs rounded-full bg-secondary/20 text-secondary-foreground font-semibold px-2 py-0.5 capitalize">
                      {inv.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Expires {formatDate(inv.expires_at)}</span>
                  </div>
                </div>

                {inv.token && (
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">
                      {inv.token}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvitationToken(inv.token!)}
                      className="gap-1 text-xs min-h-[36px]"
                    >
                      {copiedToken === inv.token ? (
                        <>
                          <Check className="h-3 w-3 text-green-600" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite Modal */}
      {currentElderlyId && (
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite to Care Circle</DialogTitle>
              <DialogDescription>
                Invite a family member or caretaker to help manage medications and care.
              </DialogDescription>
            </DialogHeader>
            <InviteForm
              elderlyProfileId={currentElderlyId}
              onSuccess={refetch}
              onCancel={() => setIsInviteOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokingId} onOpenChange={(open) => !open && setRevokingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from your Care Circle? They will immediately lose access to your medications and appointments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokingId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmRevoke}>
              Confirm Revocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default CareCirclePage
