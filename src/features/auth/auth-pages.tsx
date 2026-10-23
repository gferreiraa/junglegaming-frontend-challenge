import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { login, registerAccount } from '@/lib/api/marketplace'
import { writeToken } from '@/lib/api/storage'
import { passwordSchema } from '@/contracts'

const loginSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Informe seu nome'),
  password: passwordSchema,
})

function safeRedirect(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export function LoginPage({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) => login(values.email, values.password),
    onSuccess: async (session) => {
      writeToken(session.token)
      queryClient.setQueryData(sessionQueryOptions.queryKey, session)
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      void navigate({ href: safeRedirect(redirect) })
    },
  })

  return (
    <form className="mx-auto grid max-w-md gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <h1 className="text-3xl font-semibold">Entrar</h1>
      <Field label="E-mail" id="email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? 'email-error' : undefined} {...form.register('email')} />
      </Field>
      <Field label="Senha" id="password" error={form.formState.errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register('password')} />
      </Field>
      {mutation.error instanceof ApiError ? <p role="alert">{mutation.error.message}</p> : null}
      <Button type="submit" disabled={mutation.isPending}>
        Entrar
      </Button>
      <Link to="/register" search={{ redirect }} className="text-sm text-primary">
        Criar conta
      </Link>
    </form>
  )
}

export function RegisterPage({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: async (session) => {
      writeToken(session.token)
      queryClient.setQueryData(sessionQueryOptions.queryKey, session)
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      void navigate({ href: safeRedirect(redirect) })
    },
  })
  const emailError = form.formState.errors.email?.message ?? (mutation.error instanceof ApiError ? mutation.error.fields?.email : undefined)

  return (
    <form className="mx-auto grid max-w-md gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <h1 className="text-3xl font-semibold">Criar conta</h1>
      <Field label="Nome" id="name" error={form.formState.errors.name?.message}>
        <Input id="name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
      </Field>
      <Field label="E-mail" id="register-email" error={emailError}>
        <Input id="register-email" type="email" autoComplete="email" aria-invalid={Boolean(emailError)} {...form.register('email')} />
      </Field>
      <Field label="Senha" id="register-password" error={form.formState.errors.password?.message}>
        <Input id="register-password" type="password" autoComplete="new-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register('password')} />
      </Field>
      {mutation.error instanceof ApiError && !mutation.error.fields ? <p role="alert">{mutation.error.message}</p> : null}
      <Button type="submit" disabled={mutation.isPending}>
        Criar conta
      </Button>
      <Link to="/login" search={{ redirect }} className="text-sm text-primary">
        Já tenho conta
      </Link>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
