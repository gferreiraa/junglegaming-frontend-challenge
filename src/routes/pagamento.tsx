import { createFileRoute, redirect } from '@tanstack/react-router'
import { PaymentPage } from '@/features/kurio/payment-page'
import { sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/pagamento')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) throw redirect({ to: '/entrar', search: { redirect: location.href } })
  },
  head: () => ({ meta: [{ title: 'Pagamento — KURIO' }] }),
  component: PaymentPage,
})
