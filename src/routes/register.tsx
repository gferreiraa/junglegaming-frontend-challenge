import { createFileRoute } from '@tanstack/react-router'
import { loginSearchSchema } from '@/contracts'
import { RegisterPage } from '@/features/auth/auth-pages'

export const Route = createFileRoute('/register')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Criar conta — Jungle Market' }] }),
  component: function RegisterRoute() {
    const { redirect } = Route.useSearch()
    return <RegisterPage redirect={redirect} />
  },
})
