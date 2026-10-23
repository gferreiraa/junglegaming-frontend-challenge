import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MoreVertical, Wallet } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Network, Order } from '@/contracts'
import { getNft } from '@/data/catalog'
import { Breadcrumb, controlClass, Field } from '@/components/kurio/bits'
import { NftArt } from '@/components/kurio/portrait'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { createOrder, createQuote, fetchCart, fetchOrder, fetchWallets } from '@/lib/api/marketplace'
import { readIdempotency } from '@/lib/api/storage'
import { formatEth as formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import arrowDownIcon from '../../../design/icons/Arrow-Down.svg?url'
import thankYouIcon from '../../../design/icons/thank-you 1.svg?url'

const schema = z.object({
  displayName: z.string().min(2, 'Informe o nome de exibição'),
  username: z.string().min(2, 'Informe o nome de usuário'),
  network: z.string().min(1, 'Selecione uma rede'),
  profileName: z.string().min(2, 'Informe o nome do perfil'),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço 0x com 40 caracteres hexadecimais'),
  secondary: z.string().optional(),
  walletType: z.string().min(1, 'Selecione o tipo de carteira'),
  referral: z.string().min(1, 'Informe o código de indicação'),
  email: z.email('Informe um e-mail válido'),
  ens: z.string().min(2, 'Informe o nome ENS'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Receipt = {
  id: string
  date: string
  total: string
  fee: string
  lines: { title: string; tokenId: string; quantity: number; subtotal: string; image: string }[]
}

function showEth(value?: string) {
  return value ? formatMoney(value) : '0 ETH'
}

function networkOf(value: string | undefined): Network {
  if (value === 'Polygon') return 'polygon'
  if (value === 'Base') return 'base'
  return 'ethereum'
}

const wallets = ['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const
const payWallets = ['MetaMask', 'Coinbase Wallet'] as const
const fieldClass = cn(controlClass, 'h-10 rounded-[3px]')

function SelectArrow() {
  return <img src={arrowDownIcon} alt="" width={18} height={18} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
}

function QuoteChanged({ blocked, onAccept }: { blocked: boolean; onAccept: () => void }) {
  if (!blocked) return null
  return (
    <div role="alert" className="mt-3 rounded-md border border-danger p-3 text-caption">
      <p>A cotação mudou. Aceite os novos valores antes de confirmar.</p>
      <button type="button" className="btn btn-quiet mt-2 text-text-accent" onClick={onAccept}>
        Aceitar nova cotação
      </button>
    </div>
  )
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-2',
        checked ? 'border-primary' : 'border-primary/45',
      )}
    >
      {checked ? <span className="size-2.5 rounded-full bg-primary" /> : null}
    </span>
  )
}

export function PaymentPage() {
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const cart = useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => fetchCart(signal) })
  const quote = useQuery({
    queryKey: ['quote', 'payment', cart.data?.version, cart.data?.couponCode],
    enabled: Boolean(cart.data && cart.data.items.length > 0),
    queryFn: () => createQuote('ethereum'),
  })
  const ack = useQuery({
    queryKey: ['checkout-ack'],
    queryFn: async () => ({ dirty: false }),
    initialData: { dirty: false },
    staleTime: Number.POSITIVE_INFINITY,
    meta: { scope: 'private' },
  })
  const blocked = Boolean(ack.data?.dirty)
  const [provider, setProvider] = useState<(typeof wallets)[number] | 'rede'>('Coinbase Wallet')
  const [connected, setConnected] = useState<'principal' | 'reserva'>('reserva')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [payError, setPayError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lines = cart.data?.items ?? []
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: session.data?.user.name ?? '',
      username: '',
      network: 'Ethereum',
      profileName: session.data?.user.name ?? '',
      address: '',
      secondary: '',
      walletType: 'MetaMask',
      referral: 'KURIO',
      email: session.data?.user.email ?? '',
      ens: 'maya',
      note: '',
    },
  })

  function acceptQuote() {
    queryClient.setQueryData(['checkout-ack'], { dirty: false })
  }

  async function placeOrder(values?: FormValues) {
    if (submitting || queryClient.getQueryData<{ dirty: boolean }>(['checkout-ack'])?.dirty) return
    const user = session.data?.user
    if (!user) return
    if ((cart.data?.items.length ?? 0) === 0) {
      setPayError('O carrinho está vazio.')
      return
    }
    setSubmitting(true)
    setPayError('')
    try {
      const owned = await fetchWallets()
      const wallet =
        owned.find((item) => values?.address && item.address.toLowerCase() === values.address.toLowerCase()) ??
        owned.find((item) => item.isPrimary) ??
        owned[0]
      if (!wallet) {
        setPayError('Cadastre uma carteira antes de pagar.')
        return
      }
      const network = networkOf(values?.network)
      const fresh = await createQuote(network)
      const input = {
        quoteId: fresh.quoteId,
        walletId: wallet.id,
        network,
        collectorName: values?.displayName?.trim() || user.name,
        collectorEmail: values?.email?.trim() || user.email,
      }
      const key = readIdempotency(`${input.quoteId}:${input.walletId}:${input.network}:${input.collectorEmail}`)
      let order: Order
      try {
        order = await createOrder(input, key)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'timeout') order = await createOrder(input, key)
        else throw error
      }
      for (let attempt = 0; attempt < 20 && order.status === 'pending'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        order = await fetchOrder(order.id)
      }
      if (order.status !== 'confirmed') {
        setPayError(order.status === 'declined' ? 'Pagamento recusado.' : 'O pedido continua pendente.')
        return
      }
      setReceipt({
        id: order.txRef ?? order.id,
        date: new Date(order.createdAt).toLocaleDateString('pt-BR'),
        total: order.total,
        fee: order.networkFee,
        lines: order.items.map((item) => ({
          title: item.title,
          tokenId: item.editionId,
          quantity: item.quantity,
          subtotal: item.lineTotal,
          image: getNft(item.nftId)?.image ?? '/nfts/01.svg',
        })),
      })
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
    } catch (error) {
      setPayError(error instanceof ApiError ? error.message : 'A compra não foi concluída.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-kurio py-8 pb-28">
      <div className="hidden lg:block">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Pagamento' }]} />
        <form className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_320px]" onSubmit={form.handleSubmit((values) => void placeOrder(values))}>
          <section>
            <h1 className="text-[17px] leading-4 font-bold">Perfil do colecionador</h1>
            <div className="mt-6 grid items-end gap-6 sm:grid-cols-2">
              <Field label="Nome de exibição" required labelClassName="text-[15px] leading-[15px]">
                <input className={fieldClass} {...form.register('displayName')} />
              </Field>
              <Field label="Nome de usuário" required labelClassName="text-[15px] leading-[15px]">
                <input className={fieldClass} {...form.register('username')} />
              </Field>
              <Field label="Rede" required labelClassName="text-[15px] leading-[15px]">
                <span className="relative block">
                  <select className={cn(fieldClass, 'appearance-none pr-10')} {...form.register('network')}>
                    <option value="">Selecione uma rede</option>
                    <option>Ethereum</option>
                    <option>Polygon</option>
                    <option>Solana</option>
                  </select>
                  <SelectArrow />
                </span>
              </Field>
              <Field label="Nome do perfil" required labelClassName="text-[15px] leading-[15px]">
                <input className={fieldClass} {...form.register('profileName')} />
              </Field>
              <Field label="Endereço da carteira" required labelClassName="text-[15px] leading-[15px]">
                <input className={fieldClass} placeholder="Endereço 0x da carteira" {...form.register('address')} />
              </Field>
              <input className={fieldClass} placeholder="ENS ou carteira secundária (opcional)" aria-label="ENS ou carteira secundária (opcional)" {...form.register('secondary')} />
              <Field label="Tipo de carteira" required labelClassName="text-[15px] leading-[15px]">
                <span className="relative block">
                  <select className={cn(fieldClass, 'appearance-none pr-10')} {...form.register('walletType')}>
                    <option value="">Selecione uma carteira</option>
                    {wallets.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <SelectArrow />
                </span>
              </Field>
              <Field label="Código de indicação" required labelClassName="text-[15px] leading-[15px]">
                <input className={fieldClass} {...form.register('referral')} />
              </Field>
              <Field label="E-mail" required labelClassName="text-[15px] leading-[15px]">
                <input type="email" className={fieldClass} {...form.register('email')} />
              </Field>
              <Field label="Nome ENS" required labelClassName="text-[15px] leading-[15px]">
                <span className="flex gap-2.5">
                  <span className="relative">
                    <select className={cn(fieldClass, 'w-[78px] appearance-none pr-7 pl-3')} aria-label="Sufixo ENS" defaultValue=".eth">
                      <option>.eth</option>
                    </select>
                    <SelectArrow />
                  </span>
                  <input id="ens-name" className={cn(fieldClass, 'flex-1')} aria-label="Nome ENS" {...form.register('ens')} />
                </span>
              </Field>
            </div>
            {Object.values(form.formState.errors)[0]?.message ? (
              <p role="alert" className="mt-3 text-caption text-danger">{Object.values(form.formState.errors)[0]?.message}</p>
            ) : null}
            <label className="mt-6 flex items-center gap-2 text-body">
              <input type="radio" name="outra" className="accent-primary" /> Usar outra carteira?
            </label>
            <label className="mt-4 grid gap-2 text-[15px] leading-[15px]">
              Observação do colecionador (opcional)
              <textarea className="min-h-28 rounded-[3px] border border-border bg-transparent p-3" {...form.register('note')} />
            </label>
          </section>
          <aside>
            <div className="flex items-center justify-between border-b border-primary/80 pb-3">
              <h2 className="text-[17px] leading-4 font-bold">Seus NFTs</h2>
              <span className="text-body font-bold">Subtotal</span>
            </div>
            <ul className="mt-3 grid gap-3">
              {lines.map((line) => (
                <li key={line.editionId} className="flex items-center gap-3 rounded-md bg-surface-card px-3 py-2">
                  <NftArt src={getNft(line.nftId)?.image ?? line.imageUrl} alt="" className="size-12 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-bold">{line.title}</p>
                    <p className="text-caption text-text-muted">ID do token: #{line.editionId}</p>
                  </div>
                  <span className="text-caption text-text-secondary">(x {line.quantity})</span>
                  <span className="font-bold text-text-accent">{showEth(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-body text-text-accent">Tem um código promocional? Aplique aqui</p>
            <dl className="mt-4 grid gap-2 text-body">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{showEth(quote.data?.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>(-) {quote.data && Number(quote.data.discount) > 0 ? showEth(quote.data.discount) : '00.00'}</dd></div>
              <div className="flex justify-between"><dt>Taxa de rede<div className="text-caption text-text-muted">Taxa estimada</div></dt><dd>{showEth(quote.data?.networkFee)}</dd></div>
              <div className="mt-2 flex justify-between border-t border-primary/80 pt-3 font-bold">
                <dt>Total</dt>
                <dd className="text-body-lg text-text-accent">{showEth(quote.data?.total)}</dd>
              </div>
            </dl>
            <h3 className="mt-4 text-body font-bold">Carteira e rede</h3>
            <fieldset className="mt-3 grid gap-2">
              <label className={`flex items-center gap-3 rounded-[6px] border px-3 py-2 ${provider === 'rede' ? 'border-primary' : 'border-border'}`}>
                <input type="radio" name="provider" checked={provider === 'rede'} onChange={() => setProvider('rede')} className="accent-primary" />
                <span className="rounded-[6px] bg-surface-dark px-2 py-1 text-micro font-bold tracking-wide text-text-accent">METAMASK · WALLETCONNECT · COINBASE</span>
              </label>
              {payWallets.map((item) => (
                <label key={item} className={`flex items-center gap-3 rounded-[6px] border px-3 py-3 ${provider === item ? 'border-primary' : 'border-border'}`}>
                  <input type="radio" name="provider" checked={provider === item} onChange={() => setProvider(item)} className="accent-primary" />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>
            {payError ? <p role="alert" className="mt-3 text-caption text-danger">{payError}</p> : null}
            <QuoteChanged blocked={blocked} onAccept={acceptQuote} />
            <button type="submit" className="btn btn-fill mt-4 h-12 w-full rounded-[6px] bg-primary font-bold text-ink disabled:opacity-50" disabled={submitting || blocked}>Confirmar compra</button>
          </aside>
        </form>
      </div>

      <form className="lg:hidden" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-center gap-3">
          <Link to="/carrinho" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised text-text-muted" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-h3 font-bold">Pagamento com carteira</h1>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-bold">Carteira conectada</h2>
          <button type="button" className="text-caption text-text-accent">Trocar carteira</button>
        </div>
        {[
          ['reserva', 'Reserva', 'nova.kurio.eth', 'Rede Polygon'],
          ['principal', 'Principal', '0xA91F…E82C', 'Rede principal Ethereum'],
        ].map(([id, title, address, network]) => (
          <div key={id} className="mt-3 flex items-start gap-3 rounded-xl bg-surface-card p-4">
            <label className="flex flex-1 items-start gap-3">
              <input
                type="radio"
                name="connected"
                checked={connected === id}
                onChange={() => setConnected(id as 'principal' | 'reserva')}
                className="sr-only"
              />
              <RadioDot checked={connected === id} />
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-caption text-text-secondary">{address}</span>
                <span className="block text-caption text-text-muted">{network}</span>
              </span>
            </label>
            <button type="button" className="mt-1 text-text-muted" aria-label={`Mais opções, ${title}`}>
              <MoreVertical className="size-5" />
            </button>
          </div>
        ))}
        <h2 className="mt-6 font-bold">Carteira e rede</h2>
        <div className="mt-3 grid gap-3">
          {wallets.map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-xl bg-surface-card px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised text-text-accent">
                {item === 'Coinbase Wallet' ? <Wallet className="size-5" /> : <span className="font-bold">{item[0]}</span>}
              </span>
              <span className="flex-1">{item}</span>
              <input type="radio" name="provider-mobile" checked={provider === item} onChange={() => setProvider(item)} className="sr-only" />
              <RadioDot checked={provider === item} />
            </label>
          ))}
        </div>
        <p className="mt-6 text-right text-body-lg font-bold">Total: <span className="text-text-accent">{showEth(quote.data?.total)}</span></p>
        {payError ? <p role="alert" className="mt-3 text-caption text-danger">{payError}</p> : null}
        <div className="fixed inset-x-4 bottom-24 z-30">
          <QuoteChanged blocked={blocked} onAccept={acceptQuote} />
        </div>
        <button
          type="button"
          className="fixed inset-x-4 bottom-4 h-14 rounded-full bg-primary font-bold text-ink disabled:opacity-50"
          disabled={submitting || blocked}
          onClick={() => void placeOrder()}
        >
          Confirmar compra
        </button>
      </form>

      <Dialog open={Boolean(receipt)} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="w-[520px] max-w-[calc(100vw-2rem)] overflow-hidden border-none bg-surface-card p-6 pb-8 text-text-primary shadow-modal [&>button]:text-primary [&>button]:opacity-100">
          <img src={thankYouIcon} alt="" width={72} height={72} className="mx-auto" />
          <DialogTitle className="mt-3 text-center text-body leading-5 font-bold">Seus NFTs agora estão na sua carteira</DialogTitle>
          <dl className="mt-4 grid grid-cols-4 gap-2 border-y border-primary/70 py-3 text-caption">
            <div><dt className="text-text-secondary">ID da transação</dt><dd>{receipt?.id}</dd></div>
            <div><dt className="text-text-secondary">Data</dt><dd>{receipt?.date}</dd></div>
            <div><dt className="text-text-secondary">Total</dt><dd className="font-bold text-text-accent">{showEth(receipt?.total)}</dd></div>
            <div><dt className="text-text-secondary">Carteira</dt><dd>{provider === 'rede' ? 'MetaMask' : provider}</dd></div>
          </dl>
          <h2 className="mt-4 text-center text-body font-bold">Detalhes da transação</h2>
          <div className="mt-3 grid grid-cols-[1fr_80px_90px] text-caption text-text-secondary">
            <span>NFTs</span><span>Edições</span><span className="text-right">Subtotal</span>
          </div>
          <ul className="mt-2 grid gap-3">
            {receipt?.lines.map((line) => (
              <li key={`${line.tokenId}-${line.quantity}`} className="grid grid-cols-[1fr_80px_90px] items-center gap-2">
                <span className="flex items-center gap-2">
                  <NftArt src={line.image} alt="" className="size-10 rounded-md" />
                  <span>
                    <span className="block text-caption font-bold">{line.title}</span>
                    <span className="block text-micro text-text-muted">ID do token: #{line.tokenId}</span>
                  </span>
                </span>
                <span className="text-caption text-text-secondary">(x {line.quantity})</span>
                <span className="text-right text-caption font-bold text-text-accent">{showEth(line.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid gap-1 border-t border-primary/70 pt-3 text-caption">
            <div className="flex justify-end gap-6"><dt>Taxa de rede</dt><dd className="font-bold text-text-accent">{showEth(receipt?.fee)}</dd></div>
            <div className="flex justify-end gap-6"><dt className="font-bold">Total</dt><dd className="font-bold text-text-accent">{showEth(receipt?.total)}</dd></div>
          </dl>
          <p className="mt-4 text-center text-caption leading-5 text-text-secondary">
            Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede.
          </p>
          {receipt ? (
            <Link to="/explorer/$txRef" params={{ txRef: receipt.id }} className="btn btn-fill mx-auto mt-4 flex h-10 w-fit items-center rounded-[6px] bg-primary px-5 text-body font-bold text-ink">
              Ver no Etherscan
            </Link>
          ) : null}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[10px] bg-primary" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
