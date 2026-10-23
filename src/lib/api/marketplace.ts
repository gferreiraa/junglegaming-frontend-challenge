import { z } from 'zod'
import {
  cartSchema,
  favoritesSchema,
  nftListSchema,
  nftSchema,
  orderSchema,
  profileSchema,
  quoteSchema,
  sessionSchema,
  walletSchema,
  type Network,
} from '@/contracts'
import { api } from '@/lib/api/client'
import { asDecimalString, type CatalogSearch } from '@/contracts'

const highlightsSchema = z.object({ items: z.array(nftSchema) })
const walletsSchema = z.object({ items: z.array(walletSchema) })

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })
  return sessionSchema.parse(data)
}

export async function registerAccount(input: { name: string; email: string; password: string }) {
  const { data } = await api.post('/auth/register', input)
  return sessionSchema.parse(data)
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function fetchHighlights(signal?: AbortSignal) {
  const { data } = await api.get('/highlights', { signal })
  return highlightsSchema.parse(data).items
}

export async function fetchNfts(search: CatalogSearch, signal?: AbortSignal) {
  const { data } = await api.get('/nfts', {
    signal,
    params: {
      q: search.q,
      sort: search.sort,
      page: search.page,
      collections: search.collections,
      minPrice: asDecimalString(search.minPrice),
      maxPrice: asDecimalString(search.maxPrice),
      availability: search.availability,
    },
  })
  return nftListSchema.parse(data)
}

export async function fetchNft(nftId: string, signal?: AbortSignal) {
  const { data } = await api.get(`/nfts/${nftId}`, { signal })
  return nftSchema.parse(data)
}

export async function fetchFavorites() {
  const { data } = await api.get('/favorites')
  return favoritesSchema.parse(data)
}

export async function addFavorite(nftId: string) {
  const { data } = await api.put(`/favorites/${nftId}`)
  return favoritesSchema.parse(data)
}

export async function removeFavorite(nftId: string) {
  const { data } = await api.delete(`/favorites/${nftId}`)
  return favoritesSchema.parse(data)
}

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await api.get('/cart', { signal })
  return cartSchema.parse(data)
}

export async function addCartItem(input: { nftId: string; editionId: string; quantity: number }) {
  const { data } = await api.post('/cart/items', input)
  return cartSchema.parse(data)
}

export async function updateCartItem(editionId: string, quantity: number) {
  const { data } = await api.patch(`/cart/items/${editionId}`, { quantity })
  return cartSchema.parse(data)
}

export async function removeCartItem(editionId: string) {
  const { data } = await api.delete(`/cart/items/${editionId}`)
  return cartSchema.parse(data)
}

export async function applyCoupon(couponCode: string | null) {
  const { data } = await api.patch('/cart/coupon', { couponCode })
  return cartSchema.parse(data)
}

export async function createQuote(network: Network) {
  const { data } = await api.post('/quotes', { network })
  return quoteSchema.parse(data)
}

export async function createOrder(
  input: {
    quoteId: string
    walletId: string
    network: Network
    collectorName: string
    collectorEmail: string
  },
  idempotencyKey: string,
) {
  const { data } = await api.post('/orders', input, {
    timeout: 2500,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return orderSchema.parse(data)
}

export async function fetchOrder(orderId: string) {
  const { data } = await api.get(`/orders/${orderId}`)
  return orderSchema.parse(data)
}

export async function fetchProfile() {
  const { data } = await api.get('/profile')
  return profileSchema.parse(data)
}

export async function updateProfile(input: {
  name: string
  email: string
  bio: string
  avatarUrl: string | null
}) {
  const { data } = await api.patch('/profile', input)
  return profileSchema.parse(data)
}

export async function changePassword(input: { currentPassword: string; nextPassword: string }) {
  await api.post('/profile/password', input)
}

export async function fetchWallets() {
  const { data } = await api.get('/wallets')
  return walletsSchema.parse(data).items
}

export async function createWallet(input: {
  label: string
  address: string
  network: Network
  isPrimary: boolean
}) {
  const { data } = await api.post('/wallets', input)
  return walletSchema.parse(data)
}

export async function updateWallet(
  walletId: string,
  input: { label: string; address: string; network: Network; isPrimary: boolean },
) {
  const { data } = await api.patch(`/wallets/${walletId}`, input)
  return walletSchema.parse(data)
}
