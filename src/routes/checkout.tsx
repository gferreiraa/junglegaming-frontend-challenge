import { createFileRoute, redirect } from '@tanstack/react-router'
import { CheckoutPage } from '@/features/checkout/checkout-page'
import { sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/checkout')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  head: () => ({ meta: [{ title: 'Pagamento — Jungle Market' }] }),
  component: CheckoutPage,
})
