import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/profile`,
      })
      if (error) {
        setErrorMsg(error.message)
        return
      }
      setIsSuccess(true)
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
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
          <p className="text-muted-foreground">Reset your account password</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
          {!isSuccess ? (
            <>
              <h1 className="text-2xl font-semibold mb-2">Forgot Password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your registered email address and we'll send you instructions to reset your password.
              </p>

              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Input
                  label="Email address"
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button type="submit" className="w-full h-11" disabled={isLoading} aria-busy={isLoading}>
                  {isLoading ? 'Sending instructions...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-700">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists with that email, we have dispatched a password reset link.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ForgotPasswordPage
