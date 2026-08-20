import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { useEffect } from 'react'
import { z } from 'zod'
import { login, clearError } from '../../features/auth/authSlice'
import type { RootState, AppDispatch } from '../../store'
import { loginSchema, type LoginFormValues } from '../../lib/validation/authSchemas'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { FieldError } from '../ui/field-error'

const REMEMBER_KEY = 'nexus-remembered-email'

type LoginFormData = LoginFormValues & { remember: boolean }

export function LoginForm() {
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const [showPassword, setShowPassword] = useState(false)

  const rememberedEmail =
    typeof window !== 'undefined' ? (localStorage.getItem(REMEMBER_KEY) ?? '') : ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema.extend({ remember: z.boolean() })),
    defaultValues: { email: rememberedEmail, password: '', remember: !!rememberedEmail },
  })

  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const onSubmit = (data: LoginFormData) => {
    if (data.remember) localStorage.setItem(REMEMBER_KEY, data.email)
    else localStorage.removeItem(REMEMBER_KEY)
    dispatch(login({ email: data.email, password: data.password }))
  }

  // Copy rule: errors say what happened and how to fix it, in the system's voice.
  const errorMessage =
    error === 'invalid email or password'
      ? 'That email and password don\u2019t match. Double-check both and try again.'
      : error || null

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Sign in to manage your agent teams</p>

      <div className="mt-6 space-y-5">
        {errorMessage && (
          <div
            className="flex items-start gap-2.5 rounded-field bg-status-error/10 px-4 py-3 text-sm text-status-error ring-1 ring-inset ring-status-error/25"
            role="alert"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="login-email">Email</Label>
            <div className="mt-1.5">
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                invalid={!!errors.email}
                disabled={loading}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="login-password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
                className="pr-11"
                invalid={!!errors.password}
                disabled={loading}
                {...register('password')}
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
            <FieldError message={errors.password?.message} />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <Checkbox id="login-remember" label="Remember me" disabled={loading} {...register('remember')} />
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full bg-accent-amber text-bg-base hover:bg-accent-amber/90" disabled={loading}>
            {loading && (
              <span
                className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {loading ? 'Signing in\u2026' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-ink-muted">
          New to NEXUS?{' '}
          <Link to="/register" className="font-semibold text-accent-amber underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
