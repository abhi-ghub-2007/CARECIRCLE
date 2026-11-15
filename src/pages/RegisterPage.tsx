import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm password is required'),
    role: z.enum(['elderly', 'family', 'caretaker']),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'elderly',
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: data.role,
          },
        },
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      if (!signUpData.user) {
        setAuthError('Account creation failed. Please try again.')
        return
      }

      setRegisteredEmail(data.email)
      setIsSuccess(true)

    } catch (error) {
      console.error('Registration error:', error)
      setAuthError('An unexpected error occurred during registration.')
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
            <span className="text-2xl font-semibold text-foreground">
              CareCircle
            </span>
          </div>

          <p className="text-muted-foreground">
            Healthcare coordination made simple
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">

          {!isSuccess ? (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                Create your account
              </h1>

              {authError && (
                <Alert
                  variant="destructive"
                  className="mb-4"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
              >
                <Input
                  label="Full Name"
                  id="full_name"
                  autoComplete="name"
                  placeholder="e.g. Eleanor Vance"
                  required
                  error={errors.full_name?.message}
                  {...register('full_name')}
                />

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

                <div className="space-y-1.5">
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-foreground"
                  >
                    I am joining as a{' '}
                    <span className="text-destructive">*</span>
                  </label>

                  <select
                    id="role"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    {...register('role')}
                  >
                    <option value="elderly">
                      Elderly Individual (Managing My Own Care)
                    </option>

                    <option value="family">
                      Family Member (Supporting a Loved One)
                    </option>

                    <option value="caretaker">
                      Professional Caretaker
                    </option>
                  </select>
                </div>

                <Input
                  label="Password"
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  error={errors.password?.message}
                  {...register('password')}
                />

                <Input
                  label="Confirm Password"
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  error={errors.confirm_password?.message}
                  {...register('confirm_password')}
                />

                <Button
                  type="submit"
                  className="w-full h-11 mt-2"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{' '}

                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline focus:outline-none focus:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center space-y-4 animate-fade-in">

              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-700">
                <MailCheck className="h-6 w-6" aria-hidden="true" />
              </div>

              <h2 className="text-xl font-bold text-foreground">
                Account Created!
              </h2>

              <p className="text-sm text-muted-foreground">
                We've sent a verification email to{' '}
                <span className="font-semibold text-foreground">
                  {registeredEmail}
                </span>.
                Please check your inbox to confirm your email before signing in.
              </p>

              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full h-11">
                    Return to Sign In
                  </Button>
                </Link>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default RegisterPage