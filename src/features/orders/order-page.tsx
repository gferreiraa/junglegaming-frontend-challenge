import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/errors'
import { fetchOrder } from '@/lib/api/marketplace'
import { formatEth } from '@/lib/money'
import type { Order } from '@/contracts'

export function OrderPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()
  const order = useQuery({
    queryKey: ['order', orderId],
    meta: { scope: 'private' },
    queryFn: async () => {
      const fresh = await fetchOrder(orderId)
      const current = queryClient.getQueryData<Order>(['order', orderId])
      if (current && current.version > fresh.version) return current
      return fresh
    },
  })

  if (order.isLoading) return <Skeleton className="h-48" />
  if (order.error instanceof ApiError && order.error.status === 404) {
    return <h1 className="text-3xl font-semibold">Pedido não encontrado</h1>
  }
  if (order.isError || !order.data) {
    return (
      <div role="alert">
        <p>Não foi possível recuperar o pedido.</p>
        <Button variant="outline" onClick={() => void order.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const receipt = order.data
  return (
    <article className="grid max-w-2xl gap-4">
      <h1 className="text-3xl font-semibold">
        {receipt.status === 'confirmed'
          ? 'Compra confirmada'
          : receipt.status === 'declined'
            ? 'Pagamento recusado'
            : 'Pedido pendente'}
      </h1>
      <p data-testid="order-status">Estado: {receipt.status}</p>
      <p>Pedido {receipt.id}</p>
      {receipt.status === 'pending' ? (
        <p>A simulação ainda não confirmou esta compra. Se a conexão cair, este mesmo pedido será recuperado.</p>
      ) : null}
      {receipt.status === 'declined' ? (
        <p>Nenhum item saiu do carrinho. Você pode revisar a cotação e tentar de novo.</p>
      ) : null}
      {receipt.status === 'confirmed' ? (
        <div data-testid="receipt" className="grid gap-2 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Recibo</h2>
          <p>
            Transação simulada:{' '}
            <Link to="/explorer/$txRef" params={{ txRef: receipt.txRef ?? 'sem-referencia' }}>
              {receipt.txRef}
            </Link>
          </p>
          <ul>
            {receipt.items.map((item) => (
              <li key={item.editionId}>
                {item.title} × {item.quantity} · {formatEth(item.lineTotal)}
              </li>
            ))}
          </ul>
          <p>Subtotal {formatEth(receipt.subtotal)}</p>
          <p>Desconto {formatEth(receipt.discount)}</p>
          <p>Taxa {formatEth(receipt.networkFee)}</p>
          <p data-testid="receipt-total">Total {formatEth(receipt.total)}</p>
        </div>
      ) : null}
      <Link to="/cart" className="text-primary">
        Voltar ao carrinho
      </Link>
    </article>
  )
}
