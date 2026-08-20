import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { useEffect } from 'react'
import { register } from '../../features/auth/authSlice'
import type { RootState, AppDispatch } from '../../store'
import { registerFormSchema, type RegisterFormValues } from '../../lib/validation/authSchemas'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { FieldError } from '../ui/field-error'
import { cn } from '../../lib/cn'

export function RegisterForm() {
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  })

  useEffect(() => {
    return () => {
      dispatch({ type: 'auth/clearError' })
    }
  }, [dispatch])

  const passwordValue = watch('password') ?? ''
  const passwordChecks = [
    { met: passwordValue.length >= 8, label: 'At least 8 characters' },
    { met: /[A-Z]/.test(passwordValue), label: 'One uppercase letter' },
    { met: /[a-z]/.test(passwordValue), label: 'One lowercase letter' },
    { met: /[0-9]/.test(passwordValue), label: 'One number' },
    { met: /[^A-Za-z0-9]/.test(passwordValue), label: 'One special character' },
  ]

  const onSubmit = (data: RegisterFormValues) => {
    dispatch(
      register({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    )
  }

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Set up your workspace in under a minute</p>

      <div className="mt-6 space-y-4">
        {error && (
          <div
            className="flex items-start gap-2.5 rounded-field bg-lamp-failed/10 px-4 py-3 text-sm text-lamp-failed ring-1 ring-inset ring-lamp-failed/25"
            role="alert"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name + email side by side so the form breathes horizontally */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="reg-name">Full name</Label>
              <div className="mt-1.5">
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  invalid={!!errors.name}
                  disabled={loading}
                  {...registerField('name')}
                />
                <FieldError message={errors.name?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="reg-email">Email</Label>
              <div className="mt-1.5">
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  invalid={!!errors.email}
                  disabled={loading}
                  {...registerField('email')}
                />
                <FieldError message={errors.email?.message} />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="reg-password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="pr-11"
                invalid={!!errors.password}
                disabled={loading}
                onFocus={() => setPasswordFocused(true)}
                {...registerField('password', {
                  onBlur: () => setPasswordFocused(false),
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-muted transition-colors hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            {/* Progressive disclosure - rules only appear while the field is focused */}
            {passwordFocused && (
              <p
                className={cn(
                  'mt-1.5 flex items-center gap-1.5 text-xs transition-colors',
                  passwordChecks.every((c) => c.met) ? 'font-semibold text-lamp-done' : 'text-ink-muted',
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={cn(
                    'transition-opacity',
                    passwordChecks.every((c) => c.met) ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {passwordChecks.every((c) => c.met)
                  ? 'Password looks good'
                  : `Use ${passwordChecks.filter((c) => !c.met).map((c) => c.label.toLowerCase()).join(', ')}`}
              </p>
            )}
            <FieldError message={errors.password?.message} />
          </div>

          <div>
            <Label htmlFor="reg-confirm-password">Confirm password</Label>
            <div className="relative mt-1.5">
              <Input
                id="reg-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="pr-11"
                invalid={!!errors.confirmPassword}
                disabled={loading}
                {...registerField('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-muted transition-colors hover:text-ink"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            <FieldError message={errors.confirmPassword?.message} />
          </div>

          <div className="pt-0.5">
            <Checkbox
              id="reg-terms"
              label="I agree to the Terms & Privacy Policy"
              disabled={loading}
              invalid={!!errors.terms}
              {...registerField('terms')}
            />
            <FieldError message={errors.terms?.message} />
          </div>

          <Button type="submit" size="lg" className="w-full bg-accent-amber text-bg-base hover:bg-accent-amber/90" disabled={loading}>
            {loading && (
              <span
                className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-amber underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
