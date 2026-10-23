import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/cart-page'

export const Route = createFileRoute('/cart')({
  head: () => ({
    meta: [
      { title: 'Carrinho — Jungle Market' },
      { name: 'description', content: 'Revise quantidades, cupom e o resumo da cotação.' },
    ],
  }),
  component: CartPage,
})
