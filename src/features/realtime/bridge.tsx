import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { realtimeEventSchema, type Nft, type NftList, type Order } from '@/contracts'
import { readToken } from '@/lib/api/storage'
import { sessionQueryOptions } from '@/features/auth/session'

export function RealtimeBridge({ token }: { token: string | null }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    let socket: Socket | null = null
    let disposed = false
    const seen = new Set<string>()
    const versions = new Map<string, number>()

    const accept = (id: string, resourceId: string, version: number) => {
      if (seen.has(id)) return false
      const known = versions.get(resourceId) ?? 0
      if (version <= known) return false
      seen.add(id)
      versions.set(resourceId, version)
      if (seen.size > 500) seen.clear()
      return true
    }

    void import('socket.io-client').then(({ io }) => {
      if (disposed) return
      socket = io({
        transports: ['websocket'],
        reconnection: true,
        auth: { token: readToken() ?? '' },
      })
      socket.on('connect', () => {
        socket?.emit('session.sync', readToken())
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: ['quote'] })
        void queryClient.invalidateQueries({ queryKey: ['order'] })
        void queryClient.invalidateQueries({ queryKey: ['nft'] })
        void queryClient.invalidateQueries({ queryKey: ['nfts'] })
        void queryClient.invalidateQueries({ queryKey: ['highlights'] })
      })
      socket.on('nft.updated', (payload: unknown) => {
        const parsed = realtimeEventSchema.safeParse(payload)
        if (!parsed.success || parsed.data.type !== 'nft.updated') return
        const event = parsed.data
        if (!accept(event.id, event.resourceId, event.version)) return
        const apply = (nft: Nft): Nft => {
          if (nft.id !== event.resourceId || event.version <= nft.version) return nft
          return {
            ...nft,
            title: event.payload.title,
            version: event.version,
            editions: nft.editions.map((edition) => ({
              ...edition,
              price: event.payload.priceByEdition[edition.id] ?? edition.price,
              available: event.payload.availableByEdition[edition.id] ?? edition.available,
            })),
          }
        }
        queryClient.setQueryData<Nft>(['nft', event.resourceId], (current) => (current ? apply(current) : current))
        queryClient.setQueriesData<NftList>({ queryKey: ['nfts'] }, (current) =>
          current ? { ...current, items: current.items.map(apply) } : current,
        )
        queryClient.setQueryData<Nft[]>(['highlights'], (current) => current?.map(apply))
        queryClient.setQueryData(['checkout-ack'], { dirty: true })
        window.dispatchEvent(
          new CustomEvent('marketplace:announce', {
            detail: `O preço ou a disponibilidade de ${event.payload.title} mudou.`,
          }),
        )
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: ['quote'] })
      })
      socket.on('order.updated', (payload: unknown) => {
        const parsed = realtimeEventSchema.safeParse(payload)
        if (!parsed.success || parsed.data.type !== 'order.updated') return
        const event = parsed.data
        const session = queryClient.getQueryData(sessionQueryOptions.queryKey)
        if (!session || session.user.id !== event.userId) return
        if (!accept(event.id, event.resourceId, event.version)) return
        queryClient.setQueryData<Order>(['order', event.resourceId], (current) => {
          if (current && current.version >= event.version) return current
          return event.payload
        })
        if (event.payload.status === 'confirmed') {
          queryClient.setQueryData(['checkout-ack'], { dirty: false })
          void queryClient.invalidateQueries({ queryKey: ['cart'] })
        }
        const label =
          event.payload.status === 'confirmed'
            ? 'Pedido confirmado'
            : event.payload.status === 'declined'
              ? 'Pedido recusado'
              : 'Pedido pendente'
        window.dispatchEvent(new CustomEvent('marketplace:announce', { detail: label }))
      })
    })

    return () => {
      disposed = true
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [queryClient, token])

  return null
}
