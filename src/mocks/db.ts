import { createSeed, STORAGE_KEY, type Seed } from '@/mocks/fixtures'

export type Db = Seed

function readStorage() {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

function load(): Db {
  const storage = readStorage()
  if (storage) {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        return JSON.parse(raw) as Db
      } catch {
        // A broken snapshot is replaced by the known seed.
      }
    }
  }
  const seed = createSeed()
  storage?.setItem(STORAGE_KEY, JSON.stringify(seed))
  return seed
}

export const db: Db = load()

export function saveDb() {
  readStorage()?.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function resetDb() {
  const next = createSeed()
  db.clock = next.clock
  db.scenario = next.scenario
  db.users = next.users
  db.sessions = next.sessions
  db.nfts = next.nfts
  db.favorites = next.favorites
  db.carts = next.carts
  db.quotes = next.quotes
  db.orders = next.orders
  db.idempotency = next.idempotency
  db.wallets = next.wallets
  saveDb()
}

export function iso(time = db.clock) {
  return new Date(time).toISOString()
}
