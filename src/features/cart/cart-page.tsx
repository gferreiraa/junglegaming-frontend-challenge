import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { applyCoupon, createQuote, fetchCart, removeCartItem, updateCartItem } from '@/lib/api/marketplace'
import { readGuestId } from '@/lib/api/storage'
import { formatEth } from '@/lib/money'

export function CartPage() {
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const ownerId = session.data?.user.id ?? readGuestId()
  const cart = useQuery({
    queryKey: ['cart', ownerId],
    queryFn: ({ signal }) => fetchCart(signal),
    meta: { scope: session.data ? 'private' : 'guest' },
  })
  const quote = useQuery({
    queryKey: ['quote', ownerId, cart.data?.version, cart.data?.couponCode, 'ethereum'],
    enabled: Boolean(cart.data),
    queryFn: () => createQuote('ethereum'),
    meta: { scope: 'private' },
  })
  const [coupon, setCoupon] = useState('')

  const update = useMutation({
    scope: { id: 'cart' },
    mutationFn: (input: { editionId: string; quantity: number }) => updateCartItem(input.editionId, input.quantity),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Falha ao atualizar'),
  })
  const remove = useMutation({
    scope: { id: 'cart' },
    mutationFn: removeCartItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
  })
  const couponMutation = useMutation({
    mutationFn: applyCoupon,
    onSuccess: async () => {
      setCoupon('')
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      await queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold">Carrinho</h1>
        {cart.isLoading ? <Skeleton className="h-28" /> : null}
        {cart.isError ? (
          <div role="alert">
            <p>Não foi possível carregar o carrinho.</p>
            <Button variant="outline" onClick={() => void cart.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {cart.data && cart.data.items.length === 0 ? <p>Seu carrinho está vazio.</p> : null}
        <ul className="grid gap-3">
          {cart.data?.items.map((item) => (
            <li key={item.editionId} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[5rem_1fr_auto]">
              <img src={item.imageUrl} alt="" width={80} height={80} className="size-20 rounded-md object-cover" />
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="text-sm text-muted">{item.editionName}</p>
                <p data-testid={`line-price-${item.nftId}`}>
                  {formatEth(item.unitPrice)} · disponíveis {item.available}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`qty-${item.editionId}`} className="sr-only">
                  Quantidade de {item.title}
                </Label>
                <Input
                  id={`qty-${item.editionId}`}
                  className="w-20"
                  inputMode="numeric"
                  value={item.quantity}
                  onChange={(event) => {
                    const quantity = Number(event.target.value)
                    if (Number.isInteger(quantity) && quantity > 0) {
                      update.mutate({ editionId: item.editionId, quantity })
                    }
                  }}
                />
                <Button variant="outline" onClick={() => remove.mutate(item.editionId)}>
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            couponMutation.mutate(coupon.trim())
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="cupom">Cupom</Label>
            <Input id="cupom" value={coupon} onChange={(event) => setCoupon(event.target.value)} />
          </div>
          <Button type="submit" variant="outline">
            Aplicar cupom
          </Button>
          {cart.data?.couponCode ? (
            <Button type="button" variant="ghost" onClick={() => couponMutation.mutate(null)}>
              Remover cupom
            </Button>
          ) : null}
        </form>
        {couponMutation.error instanceof ApiError ? (
          <p role="alert">{couponMutation.error.fields?.couponCode ?? couponMutation.error.message}</p>
        ) : null}
        {cart.data?.couponCode ? <p>Cupom aplicado: {cart.data.couponCode}</p> : null}
      </section>
      <aside className="h-fit rounded-lg border border-border p-4" aria-label="Resumo do carrinho">
        <h2 className="mb-3 text-lg font-semibold">Resumo</h2>
        {quote.isLoading ? (
          <div data-testid="cart-summary-skeleton" aria-busy="true">
            <span className="sr-only">Carregando resumo</span>
            <Skeleton className="h-28" />
          </div>
        ) : null}
        {quote.isError ? (
          <div role="alert">
            <p>{quote.error instanceof ApiError ? quote.error.message : 'Falha na cotação'}</p>
            <Button className="mt-3" variant="outline" onClick={() => void quote.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {quote.data ? (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd data-testid="subtotal">{formatEth(quote.data.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Desconto</dt>
              <dd data-testid="discount">{formatEth(quote.data.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd data-testid="fee">{formatEth(quote.data.networkFee)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="total">{formatEth(quote.data.total)}</dd>
            </div>
          </dl>
        ) : null}
        {quote.isFetching && !quote.isLoading ? <p className="mt-2 text-sm text-muted">Atualizando resumo.</p> : null}
        <Button asChild className="mt-4 w-full" disabled={!cart.data || cart.data.items.length === 0}>
          <Link to="/checkout">Ir para pagamento</Link>
        </Button>
      </aside>
    </div>
  )
}
