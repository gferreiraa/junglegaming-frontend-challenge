import { createFileRoute, redirect } from '@tanstack/react-router'
import { WalletsPage } from '@/features/account/account-pages'
import { sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/wallets')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  head: () => ({ meta: [{ title: 'Carteiras — Jungle Market' }] }),
  component: WalletsPage,
})
