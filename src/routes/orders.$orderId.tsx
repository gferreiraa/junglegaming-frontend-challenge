import { createFileRoute, redirect } from '@tanstack/react-router'
import { OrderPage } from '@/features/orders/order-page'
import { sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  head: () => ({ meta: [{ title: 'Pedido — Jungle Market' }] }),
  component: function OrderRoute() {
    const { orderId } = Route.useParams()
    return <OrderPage orderId={orderId} />
  },
})
