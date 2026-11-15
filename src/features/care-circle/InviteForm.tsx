import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/services/api'
import { DEFAULT_FAMILY_PERMISSIONS, DEFAULT_CARETAKER_PERMISSIONS, PERMISSIONS } from '@/lib/constants'

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['family', 'caretaker']),
  permissions: z.array(z.string()).min(1, 'Please select at least one permission'),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteFormProps {
  elderlyProfileId: string
  onSuccess?: () => void
  onCancel: () => void
}

export function InviteForm({ elderlyProfileId, onSuccess, onCancel }: InviteFormProps) {
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'family',
      permissions: [...DEFAULT_FAMILY_PERMISSIONS],
    },
  })

  const currentRole = watch('role')
  const currentPermissions = watch('permissions') || []

  const handleRoleChange = (newRole: 'family' | 'caretaker') => {
    setValue('role', newRole)
    if (newRole === 'family') {
      setValue('permissions', [...DEFAULT_FAMILY_PERMISSIONS])
    } else {
      setValue('permissions', [...DEFAULT_CARETAKER_PERMISSIONS])
    }
  }

  const togglePermission = (perm: string) => {
    if (currentPermissions.includes(perm)) {
      setValue(
        'permissions',
        currentPermissions.filter((p) => p !== perm)
      )
    } else {
      setValue('permissions', [...currentPermissions, perm])
    }
  }

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await api.invitations.create({
        invited_email: data.email,
        role: data.role,
        permissions: data.permissions,
        elderly_profile_id: elderlyProfileId,
      })

      if (!res?.code) throw new Error('The invitation service did not return a valid code.')
      setCreatedCode(res.code)
      onSuccess?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invitation could not be created. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = () => {
    if (!createdCode) return
    navigator.clipboard.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (createdCode) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
          <ShieldCheck className="h-10 w-10 text-green-600 mx-auto mb-2" aria-hidden="true" />
          <h3 className="text-lg font-bold text-green-950">Invitation Created!</h3>
          <p className="text-sm text-green-800 mt-1">
            Share this invitation code with your caregiver or family member:
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 bg-white border border-green-300 rounded-md p-3">
            <span className="font-mono text-lg font-bold tracking-widest text-foreground select-all">
              {createdCode}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-1.5 min-h-[38px]"
              aria-label="Copy invitation code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <Alert variant="warning" className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
          <AlertDescription className="text-amber-900 text-xs">
            <strong>Security Notice:</strong> Share this code securely. It expires in 48 hours and can only be used once.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button type="button" onClick={onCancel} className="min-h-[44px]">
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Input
        label="Caregiver's Email Address"
        id="invite_email"
        type="email"
        placeholder="caregiver@example.com"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      {/* Role Selection */}
      <div className="space-y-1.5">
        <label htmlFor="invite_role" className="block text-sm font-medium text-foreground">
          Relationship Role <span className="text-destructive">*</span>
        </label>
        <select
          id="invite_role"
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={currentRole}
          onChange={(e) => handleRoleChange(e.target.value as 'family' | 'caretaker')}
        >
          <option value="family">Family Member</option>
          <option value="caretaker">Professional Caretaker</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {currentRole === 'family'
            ? 'Family members have visibility into medications, appointments, and alerts.'
            : 'Professional caretakers can log doses, manage medications, and record interventions.'}
        </p>
      </div>

      {/* Permissions Checkboxes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Granted Permissions <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-lg p-3 bg-muted/20">
          {PERMISSIONS.map((perm) => {
            const isChecked = currentPermissions.includes(perm)
            const labelText = perm.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
            return (
              <label
                key={perm}
                className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none p-1.5 rounded hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  checked={isChecked}
                  onChange={() => togglePermission(perm)}
                  aria-label={labelText}
                />
                <span>{labelText}</span>
              </label>
            )
          })}
        </div>
        {errors.permissions && (
          <p className="text-sm font-medium text-destructive">{errors.permissions.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Generating Invitation...' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  )
}
