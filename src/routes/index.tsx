import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { catalogSearchSchema } from '@/contracts'
import { HomePage } from '@/features/kurio/home-page'

const homeSearch = catalogSearchSchema.extend({
  auth: z.enum(['login', 'signup']).optional().catch(undefined),
})

export const Route = createFileRoute('/')({
  validateSearch: homeSearch,
  head: () => ({
    meta: [
      { title: 'KURIO — Marketplace de NFTs' },
      { name: 'description', content: 'Marketplace Kurio. Descubra NFTs, monte o carrinho e conclua a compra simulada.' },
    ],
  }),
  component: function HomeRoute() {
    const search = Route.useSearch()
    return <HomePage auth={search.auth} search={search} />
  },
})
