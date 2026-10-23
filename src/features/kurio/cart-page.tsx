import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { formatEth, getNft } from '@/data/catalog'
import { Breadcrumb, CarouselDots, QuantityStepper } from '@/components/kurio/bits'
import { NftArt } from '@/components/kurio/portrait'
import { ApiError } from '@/lib/api/errors'
import { applyCoupon, createQuote, fetchCart, removeCartItem, updateCartItem } from '@/lib/api/marketplace'
import { formatEth as formatQuote } from '@/lib/money'
import { cn } from '@/lib/utils'
import deleteIcon from '../../../design/icons/Delete.svg?url'

const relatedIds = ['cosmic-bloom-118', 'violet-nomad-314', 'ivory-baron-088', 'golden-beat-207', 'golden-signal-160']

function Summary({ inputId, className }: { inputId: string; className?: string }) {
  const queryClient = useQueryClient()
  const cart = useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => fetchCart(signal) })
  const quote = useQuery({
    queryKey: ['quote', 'summary', cart.data?.version, cart.data?.couponCode],
    enabled: Boolean(cart.data && cart.data.items.length > 0),
    queryFn: () => createQuote('ethereum'),
  })
  const [draft, setDraft] = useState(cart.data?.couponCode ?? '')
  const [couponError, setCouponError] = useState('')
  const coupon = useMutation({
    mutationFn: (code: string) => applyCoupon(code),
    onSuccess: async () => {
      setCouponError('')
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (error) => setCouponError(error instanceof ApiError ? error.message : 'Cupom inválido'),
  })
  const discount = quote.data?.discount
  const hasDiscount = Boolean(discount && Number(discount) > 0)
  return (
  <aside className={cn('h-fit bg-surface-card p-5', className)} aria-busy={quote.isLoading}>
    <h2 className="border-b border-primary/80 pb-3 text-[17px] leading-4 font-bold">Resumo da carteira</h2>
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault()
        coupon.mutate(draft.trim())
      }}
    >
      <label htmlFor={inputId} className="text-body leading-4">Código promocional</label>
      <div className="mt-2 flex">
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Digite o código promocional..."
          className="h-10 min-w-0 flex-1 rounded-l-full border border-border bg-transparent px-4 text-body placeholder:text-text-muted lg:rounded-l-[6px] lg:px-3"
        />
        <button type="submit" className="btn btn-fill h-10 rounded-r-full bg-primary px-4 text-body font-bold text-ink lg:rounded-r-[6px]">Aplicar</button>
      </div>
    </form>
    {couponError ? <p role="alert" className="mt-2 text-caption text-danger">{couponError}</p> : null}
    <dl className="mt-4 grid gap-3 text-body">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{quote.data ? formatQuote(quote.data.subtotal) : '0 ETH'}</dd></div>
      <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>(-) {hasDiscount ? formatQuote(discount ?? '0') : '00.00'}</dd></div>
      <div className="flex justify-between"><dt>Taxa de rede</dt><dd className="text-right">{quote.data ? formatQuote(quote.data.networkFee) : '0 ETH'}<span className="block text-caption text-text-muted">Taxa estimada</span></dd></div>
      <div className="mt-1 flex justify-between text-body-lg font-bold lg:border-t lg:border-primary/80 lg:pt-3"><dt>Total</dt><dd className="text-text-accent">{quote.data ? formatQuote(quote.data.total) : '0 ETH'}</dd></div>
    </dl>
    <Link to="/pagamento" className="btn btn-fill mt-4 flex h-11 items-center justify-center rounded-full bg-primary text-body font-bold text-ink lg:rounded-[6px]">
      Conectar e finalizar
    </Link>
    <Link to="/" className="btn btn-quiet mt-3 hidden text-center text-body text-text-accent lg:block">Continuar explorando</Link>
  </aside>
  )
}

export function CartPage() {
  const queryClient = useQueryClient()
  const cart = useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => fetchCart(signal) })
  const lines = cart.data?.items ?? []
  function changeQuantity(editionId: string, quantity: number) {
    void updateCartItem(editionId, quantity).then(() => queryClient.invalidateQueries({ queryKey: ['cart'] }))
  }

  return (
    <div className="container-kurio py-8 pb-40 lg:pb-16">
      <div className="hidden lg:block">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="grid grid-cols-[1fr_90px_140px_100px_32px] border-b border-primary/80 pb-3 text-body font-bold">
              <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
            </div>
            {lines.length === 0 ? <p className="mt-6 text-text-secondary">Seu carrinho está vazio.</p> : null}
            <ul className="mt-3 grid gap-3">
              {lines.map((line) => (
                <li key={line.editionId} className="grid grid-cols-[1fr_90px_140px_100px_32px] items-center rounded-md bg-surface-card px-3 py-3">
                  <div className="flex items-center gap-3">
                    <NftArt src={getNft(line.nftId)?.image ?? line.imageUrl} alt="" className="size-14 rounded-md" />
                    <div>
                      <p className="text-body font-bold">{line.title}</p>
                      <p className="text-caption text-text-muted">ID do token: #{line.editionId}</p>
                    </div>
                  </div>
                  <span className="text-text-accent">{formatQuote(line.unitPrice)}</span>
                  <QuantityStepper value={line.quantity} label={line.title} onChange={(quantity) => changeQuantity(line.editionId, Math.min(quantity, line.available))} />
                  <span className="font-bold text-text-accent">{formatQuote(line.lineTotal)}</span>
                  <button type="button" className="btn btn-icon grid size-8 place-items-center" aria-label={`Remover ${line.title}`} onClick={() => void removeCartItem(line.editionId).then(() => queryClient.invalidateQueries({ queryKey: ['cart'] }))}>
                    <img src={deleteIcon} alt="" width={18} height={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Summary inputId="cupom" className="rounded-lg" />
        </div>
        <h2 className="mt-16 border-b border-primary/80 pb-3 text-[17px] leading-4 font-bold text-text-accent">Colecionadores também viram</h2>
        <div className="mt-8 grid grid-cols-5 gap-4">
          {relatedIds.map((id) => {
            const nft = getNft(id)
            if (!nft) return null
            return (
              <article key={nft.id}>
                <Link to="/nft/$id" params={{ id: nft.id }} className="block overflow-hidden rounded-lg bg-surface-card p-2">
                  <NftArt src={nft.image} alt={nft.title} className="aspect-[4/5] w-full rounded-[11px]" />
                </Link>
                <p className="mt-3 text-[15px] leading-4">{nft.title}</p>
                <p className="text-body-lg leading-4 font-bold text-text-accent">{formatEth(nft.price)}</p>
              </article>
            )
          })}
        </div>
        <div className="mt-8">
          <CarouselDots count={3} active={1} />
        </div>
      </div>

      <div className="pb-72 lg:hidden">
        <div className="relative flex items-center justify-center px-1">
          <Link
            to="/"
            className="absolute left-0 grid size-10 place-items-center rounded-full bg-surface-raised text-text-muted"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-h3 font-bold">Carrinho de NFTs</h1>
        </div>
        {lines.length === 0 ? <p className="mt-6 text-text-secondary">Seu carrinho está vazio.</p> : null}
        <ul className="mt-6 grid gap-3">
          {lines.map((line) => (
            <li key={line.editionId} className="grid grid-cols-[72px_1fr] gap-3 rounded-xl bg-surface-card p-3">
              <NftArt src={getNft(line.nftId)?.image ?? line.imageUrl} alt="" className="size-[72px] rounded-md" />
              <div>
                <p className="font-bold">{line.title}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-caption text-text-muted">Edição: {line.editionName}</p>
                  <QuantityStepper value={line.quantity} label={line.title} onChange={(quantity) => changeQuantity(line.editionId, Math.min(quantity, line.available))} />
                </div>
                <p className="mt-2 font-bold text-text-accent">{formatQuote(line.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="fixed inset-x-0 bottom-0 z-20">
          <Summary inputId="cupom-mobile" className="rounded-t-2xl" />
        </div>
      </div>
    </div>
  )
}
