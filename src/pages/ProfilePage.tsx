import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, HeartPulse, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/use-toast'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  medical_notes: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  preferred_timezone: z.string().default('UTC'),
})

type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm password is required'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

const TIMEZONES = [
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

export function ProfilePage() {
  const { profile, elderlyProfile, refreshProfile } = useAuth()
  const isElderly = profile?.role === 'elderly'

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      medical_notes: elderlyProfile?.medical_notes || '',
      emergency_contact: elderlyProfile?.emergency_contact || '',
      emergency_phone: elderlyProfile?.emergency_phone || '',
      preferred_timezone: elderlyProfile?.preferred_timezone || 'UTC',
    },
  })

  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        medical_notes: elderlyProfile?.medical_notes || '',
        emergency_contact: elderlyProfile?.emergency_contact || '',
        emergency_phone: elderlyProfile?.emergency_phone || '',
        preferred_timezone: elderlyProfile?.preferred_timezone || 'UTC',
      })
    }
  }, [profile, elderlyProfile, resetProfile])

  const {
    register: regPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onSaveProfile = async (data: ProfileFormData) => {
    if (!profile) return
    setIsUpdatingProfile(true)
    try {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .eq('id', profile.id)

      if (profErr) throw new Error(profErr.message)

      if (isElderly && elderlyProfile) {
        const { error: eldErr } = await supabase
          .from('elderly_profiles')
          .update({
            medical_notes: data.medical_notes || null,
            emergency_contact: data.emergency_contact || null,
            emergency_phone: data.emergency_phone || null,
            preferred_timezone: data.preferred_timezone,
          })
          .eq('id', elderlyProfile.id)

        if (eldErr) throw new Error(eldErr.message)
      }

      await refreshProfile()
      toast({
        title: 'Profile updated',
        description: 'Your account details have been saved successfully.',
      })
    } catch (err) {
      toast({
        title: 'Failed to update profile',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onChangePassword = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      })
      if (error) {
        setPasswordError(error.message)
        return
      }
      setPasswordSuccess(true)
      resetPassword()
      toast({
        title: 'Password changed',
        description: 'Your password was updated securely.',
      })
    } catch {
      setPasswordError('Failed to change password. Please try again.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      <PageHeader
        title="Profile & Settings"
        description="Manage personal information, emergency contacts, and security credentials."
      />

      <div className="space-y-6">
        {/* Basic Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5 text-primary" aria-hidden="true" />
              Personal Information
            </CardTitle>
            <CardDescription>Your general identity details</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
              <Input
                label="Full Name"
                id="full_name"
                required
                error={profileErrors.full_name?.message}
                {...regProfile('full_name')}
              />

              <div className="space-y-1.5">
                <label htmlFor="email_readonly" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <input
                  id="email_readonly"
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="flex h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-base text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Your registered email address cannot be changed directly.
                </p>
              </div>

              <Input
                label="Phone Number"
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                error={profileErrors.phone?.message}
                {...regProfile('phone')}
              />

              {/* Elderly-specific medical notes and emergency contact */}
              {isElderly && (
                <div className="pt-4 border-t border-border space-y-4">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-primary" aria-hidden="true" />
                    Medical & Emergency Context
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Emergency Contact Name"
                      id="emergency_contact"
                      placeholder="e.g. John Doe (Son)"
                      error={profileErrors.emergency_contact?.message}
                      {...regProfile('emergency_contact')}
                    />

                    <Input
                      label="Emergency Contact Phone"
                      id="emergency_phone"
                      type="tel"
                      placeholder="+1 (555) 999-9999"
                      error={profileErrors.emergency_phone?.message}
                      {...regProfile('emergency_phone')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="preferred_timezone" className="block text-sm font-medium text-foreground">
                      Preferred Timezone
                    </label>
                    <select
                      id="preferred_timezone"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      {...regProfile('preferred_timezone')}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="medical_notes" className="block text-sm font-medium text-foreground">
                      Medical Notes / Allergies
                    </label>
                    <textarea
                      id="medical_notes"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background p-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. Allergic to Penicillin; type 2 diabetic"
                      {...regProfile('medical_notes')}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isUpdatingProfile} aria-busy={isUpdatingProfile}>
                  {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
              Security & Password
            </CardTitle>
            <CardDescription>Update your login password</CardDescription>
          </CardHeader>

          <CardContent>
            {passwordError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            {passwordSuccess && (
              <Alert variant="success" className="mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-700" aria-hidden="true" />
                <AlertDescription>Your password has been changed successfully.</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4 max-w-md">
              <Input
                label="New Password"
                id="new_password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordErrors.new_password?.message}
                {...regPassword('new_password')}
              />

              <Input
                label="Confirm New Password"
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordErrors.confirm_password?.message}
                {...regPassword('confirm_password')}
              />

              <Button type="submit" disabled={isUpdatingPassword} aria-busy={isUpdatingPassword}>
                {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ProfilePage
