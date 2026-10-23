import type { Network, Scenario } from '@/contracts'
import { simulatedPasswordHash } from '@/mocks/password'

export type DbUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  avatarUrl: string | null
  bio: string
}
export type DbSession = { token: string; userId: string; expiresAt: number }
export type DbEdition = { id: string; name: string; price: string; available: number; total: number }
export type DbNft = {
  id: string
  title: string
  description: string
  imageUrl: string
  collection: string
  creator: string
  createdAt: string
  version: number
  featured: boolean
  editions: DbEdition[]
}
export type DbFavorite = { userId: string; nftId: string }
export type DbCart = {
  ownerId: string
  couponCode: string | null
  version: number
  items: Array<{ nftId: string; editionId: string; quantity: number }>
}
export type DbWallet = {
  id: string
  userId: string
  label: string
  address: string
  network: Network
  isPrimary: boolean
}

export const BASE_CLOCK = Date.parse('2026-01-15T12:00:00.000Z')
export const SESSION_TTL = 30 * 60 * 1000
export const PAGE_SIZE = 6
export const STORAGE_KEY = 'marketplace-db-v1'

const pieces = [
  ['Dewdrop', 'Genesis', '0.10', 'Iara Luz'],
  ['Amber Lantern', 'Genesis', '0.20', 'Iara Luz'],
  ['Moss King', 'Genesis', '0.35', 'Kael Moa'],
  ['River Idol', 'Genesis', '0.50', 'Kael Moa'],
  ['Aurora Elk', 'Aurora', '0.15', 'Nia Voss'],
  ['Polar Bloom', 'Aurora', '0.28', 'Nia Voss'],
  ['Glass Finch', 'Aurora', '0.44', 'Nia Voss'],
  ['Night Ferry', 'Night Market', '0.18', 'Otto Bram'],
  ['Velvet Moth', 'Night Market', '0.33', 'Otto Bram'],
  ['Copper Rain', 'Night Market', '0.62', 'Otto Bram'],
  ['Echo Temple', 'Aurora', '0.80', 'Nia Voss'],
  ['Silent Orchid', 'Night Market', '1.10', 'Otto Bram'],
] as const

export function createSeed(): MarketplaceDb {
  const passwordHash = simulatedPasswordHash('password123')
  const nfts: DbNft[] = pieces.map((piece, index) => {
    const number = String(index + 1).padStart(2, '0')
    const id = `nft-${number}`
    const available = id === 'nft-04' ? 2 : 8
    return {
      id,
      title: piece[0],
      description: `${piece[0]} faz parte da coleção ${piece[1]}. Edição numerada, custodiada na simulação da Jungle.`,
      imageUrl: `/nfts/${number}.svg`,
      collection: piece[1],
      creator: piece[3],
      createdAt: new Date(BASE_CLOCK - (pieces.length - index) * 86_400_000).toISOString(),
      version: 1,
      featured: ['Silent Orchid', 'Echo Temple', 'Aurora Elk'].includes(piece[0]),
      editions: [
        {
          id: `${id}-original`,
          name: 'Original',
          price: piece[2],
          available,
          total: 10,
        },
        {
          id: `${id}-proof`,
          name: 'Artist proof',
          price: piece[2] === '1.10' ? '2.40' : '1.25',
          available: id === 'nft-12' ? 0 : 1,
          total: 1,
        },
      ],
    }
  })

  nfts.push(
    {
      id: 'emerald-ape-042',
      title: 'Emerald Ape #042',
      description: 'Obra digital da coleção Kurio Apes, custodiada na simulação.',
      imageUrl: '/nfts/01.svg',
      collection: 'Kurio Apes',
      creator: 'Nova Sato',
      createdAt: '2020-01-01T00:00:00.000Z',
      version: 1,
      featured: false,
      editions: [
        { id: 'emerald-ape-042-original', name: 'Original', price: '1.19', available: 8, total: 50 },
        { id: 'emerald-ape-042-proof', name: 'Artist proof', price: '1.50', available: 1, total: 1 },
      ],
    },
    {
      id: 'ivory-baron-088',
      title: 'Ivory Baron #088',
      description: 'Peça Ivory da coleção Kurio Apes, custodiada na simulação.',
      imageUrl: '/nfts/02.svg',
      collection: 'Kurio Apes',
      creator: 'Nova Sato',
      createdAt: '2020-01-02T00:00:00.000Z',
      version: 1,
      featured: false,
      editions: [
        { id: 'ivory-baron-088-original', name: 'Original', price: '1.45', available: 4, total: 10 },
        { id: 'ivory-baron-088-proof', name: 'Artist proof', price: '1.80', available: 1, total: 1 },
      ],
    },
  )

  return {
    clock: BASE_CLOCK,
    scenario: 'default' as Scenario,
    users: [
      {
        id: 'user-maya',
        name: 'Maya Chen',
        email: 'collector@example.com',
        passwordHash,
        avatarUrl: null,
        bio: 'Colecionadora de peças da floresta.',
      },
      {
        id: 'user-ada',
        name: 'Ada Nunes',
        email: 'ada@example.com',
        passwordHash,
        avatarUrl: null,
        bio: 'Segunda conta da simulação.',
      },
    ],
    sessions: [] as DbSession[],
    nfts,
    favorites: [
      { userId: 'user-maya', nftId: 'nft-05' },
      { userId: 'user-ada', nftId: 'nft-08' },
    ] satisfies DbFavorite[],
    carts: [] as DbCart[],
    quotes: [] as QuoteRecord[],
    orders: [] as OrderRecord[],
    idempotency: [] as IdempotencyRecord[],
    wallets: [
      {
        id: 'wallet-maya-primary',
        userId: 'user-maya',
        label: 'Principal',
        address: '0x1111111111111111111111111111111111111111',
        network: 'ethereum' as const,
        isPrimary: true,
      },
      {
        id: 'wallet-maya-secondary',
        userId: 'user-maya',
        label: 'Secundária',
        address: '0x2222222222222222222222222222222222222222',
        network: 'base' as const,
        isPrimary: false,
      },
    ],
  }
}

export type MarketplaceDb = {
  clock: number
  scenario: Scenario
  users: DbUser[]
  sessions: DbSession[]
  nfts: DbNft[]
  favorites: DbFavorite[]
  carts: DbCart[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  idempotency: IdempotencyRecord[]
  wallets: DbWallet[]
}

export type Seed = MarketplaceDb
export type QuoteRecord = {
  quoteId: string
  ownerId: string
  network: 'ethereum' | 'polygon' | 'base'
  couponCode: string | null
  items: Array<{
    nftId: string
    editionId: string
    title: string
    quantity: number
    unitPrice: string
    lineTotal: string
    version: number
  }>
  subtotal: string
  discount: string
  networkFee: string
  total: string
  basedOnVersions: Record<string, number>
  expiresAt: string
}
export type OrderRecord = QuoteRecord & {
  id: string
  userId: string
  status: 'pending' | 'confirmed' | 'declined'
  version: number
  walletId: string
  collectorName: string
  collectorEmail: string
  txRef: string | null
  createdAt: string
  updatedAt: string
  settleAt?: number
  settleStatus?: 'confirmed' | 'declined'
}
export type IdempotencyRecord = { key: string; hash: string; orderId: string }
