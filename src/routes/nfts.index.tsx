import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema } from '@/contracts'
import { CatalogPage } from '@/features/catalog/catalog-page'

export const Route = createFileRoute('/nfts/')({
  validateSearch: catalogSearchSchema,
  head: () => ({
    meta: [
      { title: 'Catálogo — Jungle Market' },
      { name: 'description', content: 'Busca, filtros e páginas do catálogo simulado.' },
    ],
  }),
  component: function NftsRoute() {
    const search = Route.useSearch()
    return <CatalogPage search={search} />
  },
})
