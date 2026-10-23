import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { addCartItem, addFavorite, fetchFavorites, fetchNft, removeFavorite } from '@/lib/api/marketplace'
import { formatEth } from '@/lib/money'

export function DetailPage({ nftId }: { nftId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const nft = useQuery({
    queryKey: ['nft', nftId],
    queryFn: ({ signal }) => fetchNft(nftId, signal),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  })
  const favorites = useQuery({
    queryKey: ['favorites', session.data?.user.id],
    queryFn: fetchFavorites,
    enabled: Boolean(session.data),
    meta: { scope: 'private' },
  })
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const selected = nft.data?.editions.find((edition) => edition.id === (editionId ?? nft.data.editions[0]?.id))
  const favorited = favorites.data?.nftIds.includes(nftId) ?? false

  const favoriteMutation = useMutation({
    mutationFn: (next: boolean) => (next ? addFavorite(nftId) : removeFavorite(nftId)),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', session.data?.user.id] })
      const previous = queryClient.getQueryData<{ nftIds: string[] }>(['favorites', session.data?.user.id])
      queryClient.setQueryData(['favorites', session.data?.user.id], {
        nftIds: next
          ? [...(previous?.nftIds ?? []), nftId]
          : (previous?.nftIds ?? []).filter((id) => id !== nftId),
      })
      return { previous }
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(['favorites', session.data?.user.id], context?.previous)
      toast.error('Não foi possível atualizar o favorito')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const cartMutation = useMutation({
    scope: { id: 'cart' },
    mutationFn: (input: { editionId: string; quantity: number; buyNow: boolean }) =>
      addCartItem({ nftId, editionId: input.editionId, quantity: input.quantity }),
    onSuccess: async (_cart, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      toast.success('Item adicionado ao carrinho')
      if (variables.buyNow) {
        if (session.data) void navigate({ to: '/checkout' })
        else void navigate({ to: '/login', search: { redirect: '/checkout' } })
      }
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível adicionar')
    },
  })

  if (nft.isLoading) {
    return (
      <div data-testid="detail-skeleton" className="grid gap-6 md:grid-cols-2" aria-busy="true">
        <span className="sr-only">Carregando NFT</span>
        <Skeleton className="aspect-square" />
        <div className="grid gap-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-10" />
        </div>
      </div>
    )
  }

  if (nft.error instanceof ApiError && nft.error.status === 404) {
    return (
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold">NFT não encontrado</h1>
        <p>Essa peça não existe na simulação.</p>
        <Link to="/" className="text-primary">
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  if (nft.isError || !nft.data || !selected) {
    return (
      <div role="alert" className="grid gap-3">
        <p>Não foi possível carregar esta peça.</p>
        <Button variant="outline" onClick={() => void nft.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const piece = nft.data
  const unavailable = selected.available <= 0

  return (
    <article className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <div className="grid gap-3">
        <img
          src={piece.imageUrl}
          alt={piece.title}
          width={800}
          height={800}
          className="aspect-square w-full rounded-lg object-cover"
        />
        <div className="flex gap-2" aria-label="Galeria">
          {piece.editions.map((edition) => (
            <button
              key={edition.id}
              type="button"
              aria-pressed={edition.id === selected.id}
              className="rounded-md border border-border p-1"
              onClick={() => {
                setEditionId(edition.id)
                setQuantity(1)
              }}
            >
              <img src={piece.imageUrl} alt="" width={64} height={64} className="size-16 object-cover" />
              <span className="sr-only">{edition.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid content-start gap-4">
        <p className="text-sm text-muted">
          {piece.collection} · {piece.creator}
        </p>
        <h1 className="text-4xl font-semibold">{piece.title}</h1>
        <p>{piece.description}</p>
        <p data-testid="unit-price" data-version={piece.version}>
          {formatEth(selected.price)}
        </p>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Edição</legend>
          {piece.editions.map((edition) => (
            <label key={edition.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="edition"
                  value={edition.id}
                  checked={edition.id === selected.id}
                  onChange={() => {
                    setEditionId(edition.id)
                    setQuantity(1)
                  }}
                />
                {edition.name}
              </span>
              <span>{edition.available > 0 ? `${edition.available} disponíveis` : 'Esgotada'}</span>
            </label>
          ))}
        </fieldset>
        <div className="grid gap-1">
          <Label htmlFor="quantidade">Quantidade</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label="Diminuir quantidade"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={unavailable}
            >
              −
            </Button>
            <Input
              id="quantidade"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isInteger(next)) setQuantity(Math.min(selected.available, Math.max(1, next)))
              }}
              disabled={unavailable}
            />
            <Button
              type="button"
              variant="outline"
              aria-label="Aumentar quantidade"
              onClick={() => setQuantity((current) => Math.min(selected.available, current + 1))}
              disabled={unavailable || quantity >= selected.available}
            >
              +
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            aria-pressed={favorited}
            variant="outline"
            onClick={() => {
              if (!session.data) {
                void navigate({ to: '/login', search: { redirect: `/nfts/${nftId}` } })
                return
              }
              favoriteMutation.mutate(!favorited)
            }}
          >
            {favorited ? 'Remover dos favoritos' : 'Favoritar'}
          </Button>
          <Button
            type="button"
            disabled={unavailable || cartMutation.isPending}
            onClick={() => cartMutation.mutate({ editionId: selected.id, quantity, buyNow: false })}
          >
            Adicionar ao carrinho
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={unavailable || cartMutation.isPending}
            onClick={() => cartMutation.mutate({ editionId: selected.id, quantity, buyNow: true })}
          >
            Comprar
          </Button>
        </div>
        {unavailable ? <p role="status">Esta edição está indisponível.</p> : null}
      </div>
    </article>
  )
}
