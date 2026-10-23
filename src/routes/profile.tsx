import { createFileRoute, redirect } from '@tanstack/react-router'
import { ProfilePage } from '@/features/account/account-pages'
import { sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  head: () => ({ meta: [{ title: 'Perfil — Jungle Market' }] }),
  component: ProfilePage,
})
