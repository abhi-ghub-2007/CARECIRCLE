import { UserCheck, Shield, Phone, Mail, Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { CaregiverWithProfile } from '@/services/careCircle'

interface CaregiverCardProps {
  relationship: CaregiverWithProfile
  onRevoke?: (id: string) => void
  canManage?: boolean
}

export function CaregiverCard({
  relationship,
  onRevoke,
  canManage = true,
}: CaregiverCardProps) {
  const caregiver = relationship.caregiver
  const name = caregiver?.full_name || 'Caregiver'
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isFamily = relationship.relationship_type === 'family'

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              {caregiver?.avatar_url && <AvatarImage src={caregiver.avatar_url} alt={name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-bold">{name}</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={isFamily ? 'secondary' : 'default'} className="text-[10px] capitalize">
                  {relationship.relationship_type} Member
                </Badge>
              </div>
            </div>
          </div>

          <Badge variant={relationship.status === 'active' ? 'success' : 'outline'}>
            {relationship.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {caregiver?.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{caregiver.email}</span>
          </div>
        )}

        {caregiver?.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{caregiver.phone}</span>
          </div>
        )}

        {relationship.permissions && relationship.permissions.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Permissions ({relationship.permissions.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {relationship.permissions.map((p) => (
                <span
                  key={p}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground capitalize"
                >
                  {p.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {canManage && onRevoke && (
        <CardFooter className="pt-2 border-t border-border/60 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRevoke(relationship.id)}
            className="text-destructive hover:bg-destructive/10 text-xs gap-1 min-h-[38px]"
            aria-label={`Revoke access for ${name}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Revoke Access
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
