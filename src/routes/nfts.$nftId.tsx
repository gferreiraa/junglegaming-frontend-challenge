import { createFileRoute } from '@tanstack/react-router'
import { DetailPage } from '@/features/nft/detail-page'

export const Route = createFileRoute('/nfts/$nftId')({
  head: ({ params }) => ({
    meta: [
      { title: `NFT ${params.nftId} — Jungle Market` },
      { name: 'description', content: 'Detalhe da peça, edições e compra.' },
    ],
  }),
  component: function NftRoute() {
    const { nftId } = Route.useParams()
    return <DetailPage nftId={nftId} />
  },
})
