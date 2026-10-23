import { z } from 'zod'

export const decimalStringSchema = z.string().regex(/^\d+(\.\d+)?$/)

export const networkSchema = z.enum(['ethereum', 'polygon', 'base'])
export type Network = z.infer<typeof networkSchema>

export const NETWORKS: Record<Network, { label: string; fee: string }> = {
  ethereum: { label: 'Ethereum', fee: '0.002' },
  polygon: { label: 'Polygon', fee: '0.0004' },
  base: { label: 'Base', fee: '0.0003' },
}

export const scenarioSchema = z.enum([
  'default',
  'empty',
  'slow',
  'out_of_order',
  'offline',
  'server_error',
  'session_expired',
  'register_conflict',
  'coupon_invalid',
  'coupon_expired',
  'sold_out',
  'order_timeout',
  'payment_declined',
  'payment_pending',
  'favorite_error',
])
export type Scenario = z.infer<typeof scenarioSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
})

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const editionSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: decimalStringSchema,
  available: z.number().int().nonnegative(),
  total: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  collection: z.string(),
  creator: z.string(),
  createdAt: z.string(),
  version: z.number().int(),
  featured: z.boolean(),
  editions: z.array(editionSchema),
})
export type Nft = z.infer<typeof nftSchema>

export const nftListSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
})
export type NftList = z.infer<typeof nftListSchema>

export const favoritesSchema = z.object({
  nftIds: z.array(z.string()),
})
export type Favorites = z.infer<typeof favoritesSchema>

export const cartItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
  title: z.string(),
  editionName: z.string(),
  imageUrl: z.string(),
  unitPrice: decimalStringSchema,
  lineTotal: decimalStringSchema,
  available: z.number().int().nonnegative(),
  version: z.number().int(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  ownerId: z.string(),
  couponCode: z.string().nullable(),
  version: z.number().int(),
  items: z.array(cartItemSchema),
})
export type Cart = z.infer<typeof cartSchema>

export const quoteItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: decimalStringSchema,
  lineTotal: decimalStringSchema,
  version: z.number().int(),
})

export const quoteSchema = z.object({
  quoteId: z.string(),
  ownerId: z.string(),
  network: networkSchema,
  couponCode: z.string().nullable(),
  items: z.array(quoteItemSchema),
  subtotal: decimalStringSchema,
  discount: decimalStringSchema,
  networkFee: decimalStringSchema,
  total: decimalStringSchema,
  basedOnVersions: z.record(z.string(), z.number()),
  expiresAt: z.string(),
})
export type Quote = z.infer<typeof quoteSchema>

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: orderStatusSchema,
  version: z.number().int(),
  quoteId: z.string(),
  walletId: z.string(),
  network: networkSchema,
  collectorName: z.string(),
  collectorEmail: z.string(),
  items: z.array(quoteItemSchema),
  subtotal: decimalStringSchema,
  discount: decimalStringSchema,
  networkFee: decimalStringSchema,
  total: decimalStringSchema,
  txRef: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Order = z.infer<typeof orderSchema>

export const profileSchema = userSchema.extend({
  bio: z.string(),
})
export type Profile = z.infer<typeof profileSchema>

export const walletSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
  network: networkSchema,
  isPrimary: z.boolean(),
})
export type Wallet = z.infer<typeof walletSchema>

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Informe um endereço de 42 caracteres começando com 0x')

export const passwordSchema = z.string().min(8, 'Use pelo menos 8 caracteres')

export const nftUpdatedEventSchema = z.object({
  id: z.string(),
  type: z.literal('nft.updated'),
  resourceId: z.string(),
  version: z.number().int(),
  occurredAt: z.string(),
  payload: z.object({
    title: z.string(),
    priceByEdition: z.record(z.string(), decimalStringSchema),
    availableByEdition: z.record(z.string(), z.number()),
  }),
})

export const orderUpdatedEventSchema = z.object({
  id: z.string(),
  type: z.literal('order.updated'),
  resourceId: z.string(),
  version: z.number().int(),
  userId: z.string(),
  occurredAt: z.string(),
  payload: orderSchema,
})

export const realtimeEventSchema = z.discriminatedUnion('type', [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
])
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>

export const catalogSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
  collections: z.string().optional().catch(undefined),
  minPrice: z.union([z.string(), z.number()]).optional().catch(undefined),
  maxPrice: z.union([z.string(), z.number()]).optional().catch(undefined),
  availability: z.enum(['all', 'available']).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})

export function parseCollections(value?: string) {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function asDecimalString(value: string | number | undefined) {
  if (value == null || value === '') return undefined
  return String(value)
}
