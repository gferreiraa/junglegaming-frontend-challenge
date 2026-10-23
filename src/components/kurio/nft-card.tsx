import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Search, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { formatEth, type Nft } from '@/data/catalog'
import { NftArt } from '@/components/kurio/portrait'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { addCartItem, addFavorite, fetchFavorites, fetchNft, removeFavorite } from '@/lib/api/marketplace'

export function NftCard({ nft, masonry = false }: { nft: Nft; masonry?: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const favorites = useQuery({
    queryKey: ['favorites', session.data?.user.id],
    queryFn: fetchFavorites,
    enabled: Boolean(session.data),
    meta: { scope: 'private' },
  })
  const [note, setNote] = useState('')
  const favorite = favorites.data?.nftIds.includes(nft.id) ?? false

  function requireSession() {
    if (session.data) return true
    if (window.matchMedia('(min-width: 1024px)').matches) void navigate({ to: '/', search: { auth: 'login' } })
    else void navigate({ to: '/entrar' })
    return false
  }

  async function toggle() {
    if (!requireSession()) return
    try {
      const next = favorite ? await removeFavorite(nft.id) : await addFavorite(nft.id)
      queryClient.setQueryData(['favorites', session.data?.user.id], next)
      setNote('')
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'Não foi possível atualizar o favorito.')
    }
  }

  async function add() {
    try {
      const remote = await fetchNft(nft.id)
      const edition = remote.editions.find((item) => item.available > 0) ?? remote.editions[0]
      if (!edition) throw new ApiError(404, 'not_found', 'Edição não encontrada')
      await addCartItem({ nftId: nft.id, editionId: edition.id, quantity: 1 })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      setNote('')
    } catch (error) {
      setNote(error instanceof ApiError ? error.message : 'Não foi possível adicionar ao carrinho.')
    }
  }

  return (
    <article className={`group ${masonry ? 'break-inside-avoid' : ''}`}>
      <div className="relative overflow-hidden rounded-lg bg-surface-card">
        <Link to="/nft/$id" params={{ id: nft.id }} className="block">
          <NftArt src={nft.image} alt={nft.title} className="aspect-square w-full" />
        </Link>
        {nft.rare ? (
          <span className="absolute top-3 left-3 rounded-sm bg-primary px-2 py-1 text-micro font-bold text-ink">RARO</span>
        ) : null}
        <button
          type="button"
          className="btn btn-float absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-ink/70 text-text-primary lg:hidden"
          aria-label={favorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
          aria-pressed={favorite}
          onClick={() => void toggle()}
        >
          <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <div className="absolute inset-x-0 bottom-3 hidden justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 lg:flex">
          <button
            type="button"
            className="btn btn-float grid size-9 place-items-center rounded-full bg-ink text-text-primary"
            aria-label={`Adicionar ${nft.title} ao carrinho`}
            onClick={() => void add()}
          >
            <ShoppingBag className="size-4" />
          </button>
          <button
            type="button"
            className="btn btn-float grid size-9 place-items-center rounded-full bg-ink text-text-primary"
            aria-label={favorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
            aria-pressed={favorite}
            onClick={() => void toggle()}
          >
            <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} />
          </button>
          <Link
            to="/nft/$id"
            params={{ id: nft.id }}
            className="btn btn-float grid size-9 place-items-center rounded-full bg-ink text-text-primary"
            aria-label={`Ver ${nft.title}`}
          >
            <Search className="size-4" />
          </Link>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <Link to="/nft/$id" params={{ id: nft.id }} className="btn btn-quiet text-body font-bold text-text-primary">
          {nft.title}
        </Link>
      </div>
      <p className="text-body-lg font-bold text-text-accent">
        {formatEth(nft.price)}{' '}
        {nft.compareAt ? <span className="text-caption font-normal text-text-muted line-through">{formatEth(nft.compareAt)}</span> : null}
      </p>
      {note ? <p role="alert" className="mt-1 text-caption text-danger">{note}</p> : null}
    </article>
  )
}
