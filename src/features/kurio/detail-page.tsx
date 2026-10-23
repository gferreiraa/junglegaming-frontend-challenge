import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Heart, ShoppingCart } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { formatEth, getNft, nfts } from '@/data/catalog'
import { Breadcrumb, CarouselDots, EditionChips, QuantityStepper } from '@/components/kurio/bits'
import { NftArt } from '@/components/kurio/portrait'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { addCartItem, addFavorite, fetchFavorites, fetchNft, removeFavorite } from '@/lib/api/marketplace'
import heartIcon from '../../../design/icons/heart 1.svg?url'
import starIcon from '../../../design/icons/Star.svg?url'
import linkedinIcon from '../../../design/icons/Linkedin.svg?url'
import twitterIcon from '../../../design/icons/Twitter.svg?url'
import messageIcon from '../../../design/icons/Message.svg?url'

const relatedIds = ['cosmic-bloom-118', 'violet-nomad-314', 'ivory-baron-088', 'golden-beat-207', 'golden-signal-160']

export function DetailPage({ id }: { id: string }) {
  const nft = getNft(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const remote = useQuery({
    queryKey: ['nft', id],
    queryFn: ({ signal }) => fetchNft(id, signal),
    retry: false,
  })
  const favorites = useQuery({
    queryKey: ['favorites', session.data?.user.id],
    queryFn: fetchFavorites,
    enabled: Boolean(session.data),
    meta: { scope: 'private' },
  })
  const [edition, setEdition] = useState(nft?.editions[2] ?? nft?.editions[0] ?? '1/1')
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes')
  const [thumb, setThumb] = useState(0)
  const [actionError, setActionError] = useState('')
  const stock = remote.data?.editions[0]?.available
  const favorite = favorites.data?.nftIds.includes(id) ?? false

  const buyMutation = useMutation({
    mutationFn: async () => {
      const current = remote.data ?? (await fetchNft(id))
      const editionId = current.editions[0]?.id
      if (!editionId) throw new ApiError(404, 'not_found', 'Edição não encontrada')
      const available = current.editions[0]?.available ?? 0
      return addCartItem({ nftId: id, editionId, quantity: Math.min(qty, Math.max(available, 1)) })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      void navigate({ to: '/carrinho' })
    },
    onError: (error) => setActionError(error instanceof ApiError ? error.message : 'Não foi possível comprar.'),
  })

  function requireSession() {
    if (session.data) return true
    if (window.matchMedia('(min-width: 1024px)').matches) void navigate({ to: '/', search: { auth: 'login' } })
    else void navigate({ to: '/entrar' })
    return false
  }

  function toggleFavorite() {
    if (!requireSession()) return
    const run = favorite ? removeFavorite(id) : addFavorite(id)
    void run
      .then(async (next) => {
        queryClient.setQueryData(['favorites', session.data?.user.id], next)
      })
      .catch((error: unknown) => {
        setActionError(error instanceof ApiError ? error.message : 'Não foi possível atualizar o favorito.')
      })
  }

  if (remote.isLoading && !nft) return <h1 className="container-kurio py-16 text-h2">Carregando NFT</h1>
  if (!nft) return <h1 className="container-kurio py-16 text-h2">NFT não encontrado</h1>
  const piece = nft
  const related = relatedIds.map((item) => getNft(item)).filter((item) => item && item.id !== piece.id)
  const gallery = [piece, ...nfts.filter((item) => item.id !== piece.id)].slice(0, 4)

  function buy() {
    setActionError('')
    buyMutation.mutate()
  }

  return (
    <div className="pb-36 lg:pb-16">
      <div className="container-kurio hidden py-8 lg:block">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }]} />
        <div className="mt-3 flex items-stretch gap-8">
          <div className="relative flex h-[448px] w-[573px] shrink-0 items-center gap-7">
            <div className="flex w-[100px] flex-col gap-4">
              {gallery.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Ver ${item.title}`}
                  aria-pressed={thumb === index}
                  onClick={() => setThumb(index)}
                  className={`overflow-hidden rounded-lg border ${thumb === index ? 'border-primary' : 'border-transparent'}`}
                >
                  <NftArt src={item.image} alt="" className="h-[100px] w-[100px]" />
                </button>
              ))}
            </div>
            <div className="grid size-[444px] place-items-center rounded-[6px] bg-surface-card p-4">
              <NftArt src={gallery[thumb]?.image ?? piece.image} alt={piece.title} className="size-[404px] rounded-[24px]" />
            </div>
            <button
              type="button"
              className="btn btn-icon absolute top-[15px] right-0 grid size-[30px] place-items-center rounded-full border border-border bg-surface-raised"
              aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              aria-pressed={favorite}
              onClick={toggleFavorite}
            >
              <img src={heartIcon} alt="" width={20} height={20} />
            </button>
          </div>
          <div className="flex min-h-[448px] flex-1 flex-col justify-between">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-[28px] font-bold">{piece.title}</h1>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[22px] leading-4 font-bold text-text-accent">{formatEth(piece.price)}</p>
                <p className="flex items-center gap-1 text-[15px] leading-4">
                  {Array.from({ length: 5 }, (_, index) => (
                    <img key={index} src={starIcon} alt="" width={15} height={15} />
                  ))}
                  <span className="ml-1">{piece.reviews} avaliações de colecionadores</span>
                </p>
              </div>
              <span className="h-px w-full bg-primary/80" />
            </div>
            <div className="grid max-w-[574px] gap-3">
              <h2 className="text-[15px] leading-4 font-bold">Sobre este NFT:</h2>
              <p className="text-body leading-6 text-text-secondary">{piece.about}</p>
            </div>
            <div>
              <h2 className="text-[15px] leading-4 font-bold">Edição:</h2>
              <div className="mt-3">
                <EditionChips editions={piece.editions} value={edition} onChange={setEdition} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3" aria-label="quantidade">
                <button
                  type="button"
                  className="btn btn-fill grid h-[50px] w-[33px] place-items-center rounded-full bg-primary text-[20px] text-ink"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQty((value) => Math.max(1, value - 1))}
                >
                  −
                </button>
                <span className="min-w-4 text-center text-[20px] leading-7">{qty}</span>
                <button
                  type="button"
                  className="btn btn-fill grid h-[50px] w-[33px] place-items-center rounded-full bg-primary text-[20px] text-ink"
                  aria-label="Aumentar quantidade"
                  disabled={!remote.data || qty >= (stock ?? 0)}
                  onClick={() => setQty((value) => value + 1)}
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-fill h-10 w-[130px] rounded-[6px] bg-primary text-body leading-5 font-bold text-ink" onClick={buy} disabled={buyMutation.isPending}>
                  COMPRAR
                </button>
                <button
                  type="button"
                  className="btn inline-flex h-10 w-[130px] items-center justify-center gap-2 rounded-[6px] border border-primary text-body leading-5 font-medium text-text-accent"
                  aria-pressed={favorite}
                  onClick={toggleFavorite}
                >
                  <img src={heartIcon} alt="" width={20} height={20} />
                  Favoritar
                </button>
              </div>
            </div>
            {actionError ? <p role="alert" className="text-caption text-danger">{actionError}</p> : null}
            <div className="grid w-[308px] gap-3">
              <dl className="grid gap-3 text-[15px] leading-4 text-text-muted">
                <div><dt className="inline">ID do token: </dt><dd className="inline">#{piece.tokenId}</dd></div>
                <div><dt className="inline">Coleção: </dt><dd className="inline">{piece.collection}</dd></div>
                <div><dt className="inline">Atributos: </dt><dd className="inline">{piece.attributes.join(', ')}</dd></div>
              </dl>
              <div className="flex items-center gap-2 text-[15px] leading-4 font-bold">
                <span>Compartilhar este NFT:</span>
                <a href="https://www.linkedin.com" className="btn btn-icon grid size-6 place-items-center" aria-label="Compartilhar no LinkedIn">
                  <img src={linkedinIcon} alt="" width={15} height={15} />
                </a>
                <a href="mailto:contato@email.com" className="btn btn-icon grid size-6 place-items-center" aria-label="Compartilhar por e-mail">
                  <img src={messageIcon} alt="" width={18} height={18} />
                </a>
                <a href="https://twitter.com" className="btn btn-icon grid size-6 place-items-center" aria-label="Compartilhar no Twitter">
                  <img src={twitterIcon} alt="" width={16} height={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-24">
          <div className="flex items-end gap-8">
            <button type="button" className="grid gap-3 text-left" onClick={() => setTab('detalhes')}>
              <span className={`text-[17px] leading-4 ${tab === 'detalhes' ? 'font-bold text-text-accent' : 'text-text-primary'}`}>Detalhes do NFT</span>
              <span className={`h-[3px] ${tab === 'detalhes' ? 'bg-primary' : 'bg-transparent'}`} />
            </button>
            <button type="button" className="pb-4 text-left text-[17px] leading-4" onClick={() => setTab('avaliacoes')}>
              Avaliações de colecionadores ({piece.reviews})
            </button>
          </div>
          <span className="block h-px bg-primary/80" />
          {tab === 'detalhes' ? (
            <div className="mt-3 grid max-w-4xl gap-3 text-body leading-6">
              {piece.details.split('\n\n').map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="text-text-secondary">{paragraph}</p>
              ))}
              <p className="font-bold text-text-primary">Rede:</p>
              <p className="text-text-secondary">Cunhado na {piece.network} com procedência imutável e metadados armazenados no IPFS.</p>
              <p className="font-bold text-text-primary">Contrato:</p>
              <p className="text-text-secondary">Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
              <p className="font-bold text-text-primary">Direitos autorais:</p>
              <p className="text-text-secondary">0x7A42...19E8 • Contrato inteligente ERC-721 verificado.</p>
            </div>
          ) : (
            <p className="mt-3 max-w-4xl text-body leading-6 text-text-secondary">
              {piece.reviews} avaliações de colecionadores acompanham esta peça nesta demonstração.
            </p>
          )}
        </section>

        <section className="mt-24">
          <h2 className="text-[17px] leading-4 font-bold text-text-accent">Mais desta coleção</h2>
          <span className="mt-3 block h-px bg-primary/80" />
          <div className="mt-8 grid grid-cols-5 gap-4">
            {related.map((item) =>
              item ? (
                <article key={item.id}>
                  <Link to="/nft/$id" params={{ id: item.id }} className="block overflow-hidden rounded-lg bg-surface-card p-2">
                    <NftArt src={item.image} alt={item.title} className="aspect-[4/5] w-full rounded-[11px]" />
                  </Link>
                  <p className="mt-3 text-[15px] leading-4">{item.title}</p>
                  <p className="text-body-lg leading-4 font-bold text-text-accent">{formatEth(item.price)}</p>
                </article>
              ) : null,
            )}
          </div>
          <div className="mt-8">
            <CarouselDots count={3} active={1} />
          </div>
        </section>
      </div>

      <div className="lg:hidden">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="grid size-10 place-items-center rounded-full bg-surface-raised text-text-muted" aria-label="Voltar">
              <ChevronLeft className="size-5" />
            </Link>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full bg-surface-raised text-text-accent"
              aria-label="Favoritar"
              aria-pressed={favorite}
              onClick={toggleFavorite}
            >
              <Heart className="size-5" fill={favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <NftArt src={nft.image} alt={nft.title} className="mt-3 aspect-square w-full rounded-2xl" />
        </div>
        <div className="mt-3 bg-surface-card px-6 pt-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-h3 font-bold">{nft.title}</h1>
            <span className="rounded-full border border-primary px-2 py-1 text-caption text-text-accent">★ {nft.rating}({nft.reviews})</span>
          </div>
          <p className="mt-3 text-body text-text-secondary">{nft.about}</p>
          <h2 className="mt-4 text-body font-bold">Edição:</h2>
          <div className="mt-2">
            <EditionChips editions={nft.editions} value={edition} onChange={setEdition} />
          </div>
          <dl className="mt-4 grid gap-1 text-caption text-text-secondary">
            <div><dt className="inline">ID do token: </dt><dd className="inline">#{nft.tokenId}</dd></div>
            <div><dt className="inline">Coleção: </dt><dd className="inline">{nft.collection}</dd></div>
            <div><dt className="inline">Atributos: </dt><dd className="inline">{nft.attributes.join(', ')}</dd></div>
          </dl>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 grid gap-3 rounded-t-xl bg-surface-card px-4 pt-3 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-caption text-text-secondary">Qtd.</span>
            <QuantityStepper value={qty} onChange={setQty} label="quantidade" />
            <span className="ml-auto text-body-lg font-bold text-text-accent">{formatEth(nft.price)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-fill h-12 flex-1 rounded-full bg-primary text-body font-bold text-ink" onClick={buy}>
              Comprar NFT
            </button>
            <button
              type="button"
              className="btn btn-icon grid size-12 shrink-0 place-items-center rounded-full border border-border text-text-secondary"
              aria-label="Adicionar ao carrinho"
              onClick={buy}
            >
              <ShoppingCart className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
