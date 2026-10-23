import { createFileRoute } from '@tanstack/react-router'
import { DetailPage } from '@/features/kurio/detail-page'

export const Route = createFileRoute('/nft/$id')({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — KURIO` }] }),
  component: function NftRoute() {
    const { id } = Route.useParams()
    return <DetailPage id={id} />
  },
})
