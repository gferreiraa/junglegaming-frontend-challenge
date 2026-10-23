import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NETWORKS, networkSchema, type Network } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { createOrder, createQuote, fetchCart, fetchWallets } from '@/lib/api/marketplace'
import { readCheckoutDraft, readIdempotency, writeCheckoutDraft } from '@/lib/api/storage'
import { formatEth } from '@/lib/money'

type LinkState = 'disconnected' | 'connecting' | 'connected' | 'refused'

export function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const draft = readCheckoutDraft()
  const [name, setName] = useState(draft?.collectorName || session.data?.user.name || '')
  const [email, setEmail] = useState(draft?.collectorEmail || session.data?.user.email || '')
  const [walletChoice, setWalletChoice] = useState(draft?.walletId ?? '')
  const [network, setNetwork] = useState<Network>(
    networkSchema.safeParse(draft?.network).success ? (draft?.network as Network) : 'ethereum',
  )
  const [linkState, setLinkState] = useState<LinkState>('disconnected')
  const ownerId = session.data?.user.id
  const cart = useQuery({
    queryKey: ['cart', ownerId],
    queryFn: ({ signal }) => fetchCart(signal),
    enabled: Boolean(ownerId),
    meta: { scope: 'private' },
  })
  const wallets = useQuery({
    queryKey: ['wallets', ownerId],
    queryFn: fetchWallets,
    enabled: Boolean(ownerId),
    meta: { scope: 'private' },
  })
  const walletId = walletChoice || wallets.data?.find((wallet) => wallet.isPrimary)?.id || ''
  const quote = useQuery({
    queryKey: ['quote', ownerId, cart.data?.version, cart.data?.couponCode, network],
    enabled: Boolean(cart.data),
    queryFn: () => createQuote(network),
    meta: { scope: 'private' },
  })
  const ack = useQuery({
    queryKey: ['checkout-ack'],
    queryFn: async () => ({ dirty: false }),
    initialData: { dirty: false },
    staleTime: Number.POSITIVE_INFINITY,
    meta: { scope: 'private' },
  })

  useEffect(() => {
    writeCheckoutDraft({ collectorName: name, collectorEmail: email, walletId, network })
  }, [name, email, walletId, network])

  const orderMutation = useMutation({
    scope: { id: 'checkout' },
    mutationFn: async () => {
      if (!quote.data) throw new ApiError(409, 'quote_stale', 'Atualize a cotação')
      const input = {
        quoteId: quote.data.quoteId,
        walletId,
        network,
        collectorName: name.trim(),
        collectorEmail: email.trim(),
      }
      const key = readIdempotency(`${input.quoteId}:${input.walletId}:${input.network}:${input.collectorEmail}`)
      try {
        return await createOrder(input, key)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'timeout') return createOrder(input, key)
        throw error
      }
    },
    onSuccess: (order) => {
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'A compra não foi concluída')
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const blocked = Boolean(ack.data?.dirty)
  const canPay =
    linkState === 'connected' &&
    !blocked &&
    Boolean(quote.data) &&
    name.trim().length > 1 &&
    email.includes('@') &&
    Boolean(walletId) &&
    (cart.data?.items.length ?? 0) > 0

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canPay || orderMutation.isPending) return
        orderMutation.mutate()
      }}
    >
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold">Pagamento</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="collector-name">Nome do colecionador</Label>
            <Input id="collector-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="collector-email">E-mail</Label>
            <Input
              id="collector-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="wallet">Carteira</Label>
          <select
            id="wallet"
            className="h-10 rounded-md border border-border bg-background px-3"
            value={walletId}
            onChange={(event) => {
              setWalletChoice(event.target.value)
              setLinkState('disconnected')
            }}
          >
            <option value="">Selecione</option>
            {wallets.data?.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.label} · {wallet.address.slice(0, 8)}…
              </option>
            ))}
          </select>
          {wallets.data && wallets.data.length === 0 ? (
            <p>
              Nenhuma carteira.{' '}
              <Link to="/wallets" className="text-primary">
                Cadastrar
              </Link>
            </p>
          ) : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="network">Rede</Label>
          <select
            id="network"
            className="h-10 rounded-md border border-border bg-background px-3"
            value={network}
            onChange={(event) => setNetwork(networkSchema.parse(event.target.value))}
          >
            {Object.entries(NETWORKS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" aria-live="polite">
          <Button
            type="button"
            onClick={() => {
              setLinkState('connecting')
              window.setTimeout(() => setLinkState('connected'), 300)
            }}
            disabled={!walletId || linkState === 'connecting'}
          >
            Conectar carteira
          </Button>
          <Button type="button" variant="outline" onClick={() => setLinkState('refused')}>
            Simular recusa
          </Button>
          <Button type="button" variant="ghost" onClick={() => setLinkState('disconnected')}>
            Desconectar
          </Button>
          <p>
            Estado da conexão:{' '}
            {linkState === 'connected'
              ? 'conectada'
              : linkState === 'connecting'
                ? 'conectando'
                : linkState === 'refused'
                  ? 'recusada'
                  : 'desconectada'}
          </p>
        </div>
      </section>
      <aside className="h-fit rounded-lg border border-border p-4" aria-label="Revisão do pedido">
        <h2 className="text-lg font-semibold">Revisão</h2>
        {quote.isLoading ? (
          <div data-testid="checkout-summary-skeleton" aria-busy="true">
            <span className="sr-only">Carregando revisão</span>
            <Skeleton className="mt-3 h-32" />
          </div>
        ) : null}
        {quote.isError ? (
          <div role="alert" className="mt-3">
            <p>{quote.error instanceof ApiError ? quote.error.message : 'Cotação indisponível'}</p>
            <Button className="mt-3" type="button" variant="outline" onClick={() => void quote.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {quote.data ? (
          <div className="mt-3 grid gap-2 text-sm">
            <ul>
              {quote.data.items.map((item) => (
                <li key={item.editionId}>
                  {item.title} × {item.quantity} · {formatEth(item.lineTotal)}
                </li>
              ))}
            </ul>
            <p data-testid="checkout-subtotal">Subtotal {formatEth(quote.data.subtotal)}</p>
            <p data-testid="checkout-discount">Desconto {formatEth(quote.data.discount)}</p>
            <p data-testid="checkout-fee">Taxa {formatEth(quote.data.networkFee)}</p>
            <p className="text-base font-semibold" data-testid="checkout-total">
              Total {formatEth(quote.data.total)}
            </p>
          </div>
        ) : null}
        {blocked ? (
          <div role="alert" className="mt-3 rounded-md border border-danger p-3">
            <p>A cotação mudou. Aceite os novos valores antes de confirmar.</p>
            <Button
              className="mt-2"
              type="button"
              variant="outline"
              onClick={() => queryClient.setQueryData(['checkout-ack'], { dirty: false })}
            >
              Aceitar nova cotação
            </Button>
          </div>
        ) : null}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="mt-3" type="button" variant="ghost">
              Como a taxa é calculada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Taxa de rede simulada</DialogTitle>
            <DialogDescription>
              O valor vem da cotação da API para a rede escolhida. Ethereum, Polygon e Base têm taxas diferentes, sempre
              em string decimal.
            </DialogDescription>
          </DialogContent>
        </Dialog>
        <Button className="mt-4 w-full" type="submit" disabled={!canPay || orderMutation.isPending}>
          {orderMutation.isPending ? 'Enviando pedido' : 'Confirmar compra'}
        </Button>
      </aside>
    </form>
  )
}
