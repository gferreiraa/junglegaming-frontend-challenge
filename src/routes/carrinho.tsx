import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/kurio/cart-page'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: 'Carrinho — KURIO' }] }),
  component: CartPage,
})
