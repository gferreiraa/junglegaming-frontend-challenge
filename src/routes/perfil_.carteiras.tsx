import { createFileRoute, redirect } from '@tanstack/react-router'
import { WalletsPage } from '@/features/kurio/account-pages'
import { sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/perfil_/carteiras')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) throw redirect({ to: '/entrar', search: { redirect: location.href } })
  },
  head: () => ({ meta: [{ title: 'Carteiras — KURIO' }] }),
  component: WalletsPage,
})
