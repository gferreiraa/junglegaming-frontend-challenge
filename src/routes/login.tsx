import { createFileRoute } from '@tanstack/react-router'
import { loginSearchSchema } from '@/contracts'
import { LoginPage } from '@/features/auth/auth-pages'

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Entrar — Jungle Market' }] }),
  component: function LoginRoute() {
    const { redirect } = Route.useSearch()
    return <LoginPage redirect={redirect} />
  },
})
