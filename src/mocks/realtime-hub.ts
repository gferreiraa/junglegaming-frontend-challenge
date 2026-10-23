import type { RealtimeEvent } from '@/contracts'
import { db } from '@/mocks/db'

export type LiveConnection = {
  userId: string | null
  emit: (event: string, payload: unknown) => void
}

const connections = new Set<LiveConnection>()

export function registerConnection(connection: LiveConnection) {
  connections.add(connection)
  return () => connections.delete(connection)
}

export function bindUser(token: string | null, connection: LiveConnection) {
  if (!token) {
    connection.userId = null
    return
  }
  const session = db.sessions.find((item) => item.token === token && item.expiresAt > db.clock)
  connection.userId = session?.userId ?? null
}

export function publish(event: RealtimeEvent) {
  for (const connection of connections) {
    if (event.type === 'order.updated' && connection.userId !== event.userId) continue
    connection.emit(event.type, event)
  }
}
