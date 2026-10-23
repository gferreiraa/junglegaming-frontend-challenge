const TOKEN_KEY = 'marketplace-token'
const GUEST_KEY = 'marketplace-guest-id'
const IDEMPOTENCY_KEY = 'marketplace-idempotency'
const CHECKOUT_DRAFT_KEY = 'marketplace-checkout-draft'

export type CheckoutDraft = {
  collectorName: string
  collectorEmail: string
  walletId: string
  network: string
}

export function readToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function writeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function readGuestId() {
  const current = localStorage.getItem(GUEST_KEY)
  if (current) return current
  const next = crypto.randomUUID()
  localStorage.setItem(GUEST_KEY, next)
  return next
}

export function readIdempotency(fingerprint: string) {
  const raw = sessionStorage.getItem(IDEMPOTENCY_KEY)
  if (!raw) return createIdempotency(fingerprint)
  try {
    const parsed = JSON.parse(raw) as { fingerprint?: string; key?: string }
    if (parsed.fingerprint === fingerprint && parsed.key) return parsed.key
  } catch {
    // A draft from an older build is replaced below.
  }
  return createIdempotency(fingerprint)
}

function createIdempotency(fingerprint: string) {
  const key = crypto.randomUUID()
  sessionStorage.setItem(IDEMPOTENCY_KEY, JSON.stringify({ fingerprint, key }))
  return key
}

export function readCheckoutDraft(): CheckoutDraft | null {
  const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CheckoutDraft
  } catch {
    return null
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft))
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(CHECKOUT_DRAFT_KEY)
  sessionStorage.removeItem(IDEMPOTENCY_KEY)
}
