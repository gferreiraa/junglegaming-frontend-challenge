import { toSocketIo } from '@mswjs/socket.io-binding'
import { http, HttpResponse, ws } from 'msw'
import { z } from 'zod'
import {
  addressSchema,
  NETWORKS,
  networkSchema,
  passwordSchema,
  realtimeEventSchema,
  scenarioSchema,
  type Order,
  type RealtimeEvent,
} from '@/contracts'
import { db, iso, resetDb, saveDb } from '@/mocks/db'
import { PAGE_SIZE, SESSION_TTL, type OrderRecord, type QuoteRecord } from '@/mocks/fixtures'
import { compare, minus, mul, percent, plus } from '@/mocks/money'
import { simulatedPasswordHash } from '@/mocks/password'
import { bindUser, publish, registerConnection, type LiveConnection } from '@/mocks/realtime-hub'

// MSW 2.15 removes the `/socket.io/` prefix before matching, so the
// handler sees the default namespace path instead of the engine.io URL.
const market = ws.link(/./)

function fail(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, fields } }, { status })
}

async function wait(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function maybeDelay(request: Request, kind: 'catalog' | 'slowable') {
  const scenario = db.scenario
  if (kind === 'catalog' && scenario === 'offline') return HttpResponse.error()
  if (kind === 'catalog' && scenario === 'server_error') {
    return fail(503, 'transient', 'O catálogo está indisponível agora')
  }
  if (scenario === 'slow' && kind !== 'catalog') {
    await wait(1200, request.signal)
  }
  if (scenario === 'slow' && kind === 'catalog') {
    await wait(1200, request.signal)
  }
  if (scenario === 'out_of_order' && kind === 'catalog') {
    const query = new URL(request.url).searchParams.get('q')
    await wait(query === 'alpha' ? 1800 : 40, request.signal)
  }
  return null
}

function principal(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const guestId = request.headers.get('x-guest-id') || 'anonymous'
  if (db.scenario === 'session_expired' && token) {
    return { user: undefined, ownerId: guestId }
  }
  const session = db.sessions.find((item) => item.token === token)
  if (!session || session.expiresAt <= db.clock) return { user: undefined, ownerId: guestId }
  const user = db.users.find((item) => item.id === session.userId)
  return { user, ownerId: user?.id ?? guestId }
}

function publicUser(user: (typeof db.users)[number]) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

function findEdition(nftId: string, editionId: string) {
  const nft = db.nfts.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  return { nft, edition }
}

function cartFor(ownerId: string) {
  let cart = db.carts.find((item) => item.ownerId === ownerId)
  if (!cart) {
    cart = { ownerId, couponCode: null, version: 1, items: [] }
    db.carts.push(cart)
  }
  return cart
}

function presentCart(ownerId: string) {
  const cart = cartFor(ownerId)
  return {
    ownerId,
    couponCode: cart.couponCode,
    version: cart.version,
    items: cart.items.flatMap((item) => {
      const { nft, edition } = findEdition(item.nftId, item.editionId)
      if (!nft || !edition) return []
      return [
        {
          nftId: nft.id,
          editionId: edition.id,
          quantity: item.quantity,
          title: nft.title,
          editionName: edition.name,
          imageUrl: nft.imageUrl,
          unitPrice: edition.price,
          lineTotal: mul(edition.price, item.quantity),
          available: edition.available,
          version: nft.version,
        },
      ]
    }),
  }
}

function mergeGuestCart(guestId: string, userId: string) {
  const guest = db.carts.find((item) => item.ownerId === guestId)
  if (!guest || guestId === userId) return
  const cart = cartFor(userId)
  for (const item of guest.items) {
    const { edition } = findEdition(item.nftId, item.editionId)
    if (!edition) continue
    const existing = cart.items.find(
      (line) => line.nftId === item.nftId && line.editionId === item.editionId,
    )
    const nextQuantity = Math.min(edition.available, (existing?.quantity ?? 0) + item.quantity)
    if (nextQuantity <= 0) continue
    if (existing) existing.quantity = nextQuantity
    else cart.items.push({ ...item, quantity: nextQuantity })
  }
  if (!cart.couponCode) cart.couponCode = guest.couponCode
  cart.version += 1
  db.carts = db.carts.filter((item) => item.ownerId !== guestId)
}

function issueSession(userId: string) {
  const token = crypto.randomUUID()
  const expiresAt = db.clock + SESSION_TTL
  db.sessions = db.sessions.filter((item) => item.userId !== userId)
  db.sessions.push({ token, userId, expiresAt })
  return {
    token,
    expiresAt: iso(expiresAt),
    user: publicUser(db.users.find((item) => item.id === userId)!),
  }
}

function couponStatus(code: string | null) {
  if (!code) return 'empty' as const
  if (db.scenario === 'coupon_invalid') return 'invalid' as const
  if (db.scenario === 'coupon_expired' || code.toUpperCase() === 'EXPIRED') return 'expired' as const
  if (code.toUpperCase() === 'WELCOME10') return 'ok' as const
  return 'invalid' as const
}

function quoteFromCart(ownerId: string, network: z.infer<typeof networkSchema>): QuoteRecord | Response {
  if (db.scenario === 'sold_out') {
    return fail(409, 'unavailable', 'Uma edição do carrinho esgotou')
  }
  const cart = presentCart(ownerId)
  const status = couponStatus(cart.couponCode)
  if (status === 'invalid') return fail(422, 'coupon_invalid', 'Cupom inválido')
  if (status === 'expired') return fail(422, 'coupon_expired', 'Cupom expirado')
  for (const item of cart.items) {
    if (item.quantity > item.available) {
      return fail(409, 'unavailable', `${item.title} não tem essa quantidade`)
    }
  }
  const subtotal = cart.items.reduce((total, item) => plus(total, item.lineTotal), '0')
  const discount = status === 'ok' ? percent(subtotal, '0.10') : '0'
  const networkFee = cart.items.length > 0 ? NETWORKS[network].fee : '0'
  const quote: QuoteRecord = {
    quoteId: crypto.randomUUID(),
    ownerId,
    network,
    couponCode: status === 'ok' ? cart.couponCode : null,
    items: cart.items.map((item) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      version: item.version,
    })),
    subtotal,
    discount,
    networkFee,
    total: plus(minus(subtotal, discount), networkFee),
    basedOnVersions: Object.fromEntries(cart.items.map((item) => [item.nftId, item.version])),
    expiresAt: iso(db.clock + 10 * 60 * 1000),
  }
  db.quotes.push(quote)
  saveDb()
  return quote
}

function quoteIsCurrent(quote: QuoteRecord) {
  return quote.items.every((item) => {
    const { nft, edition } = findEdition(item.nftId, item.editionId)
    if (!nft || !edition) return false
    return nft.version === item.version && edition.price === item.unitPrice && edition.available >= item.quantity
  })
}

function settle(orderId: string, status: 'confirmed' | 'declined') {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending') return
  order.status = status
  order.version += 1
  order.updatedAt = iso()
  if (status === 'confirmed') {
    order.txRef = `0xsim${order.id.replaceAll('-', '').slice(0, 16)}`
    const cart = db.carts.find((item) => item.ownerId === order.userId)
    if (cart) {
      for (const line of order.items) {
        const current = cart.items.find(
          (item) => item.nftId === line.nftId && item.editionId === line.editionId,
        )
        if (!current) continue
        current.quantity -= line.quantity
        const { edition } = findEdition(line.nftId, line.editionId)
        if (edition) edition.available = Math.max(0, edition.available - line.quantity)
      }
      cart.items = cart.items.filter((item) => item.quantity > 0)
      cart.version += 1
    }
  }
  saveDb()
  const event: RealtimeEvent = {
    id: crypto.randomUUID(),
    type: 'order.updated',
    resourceId: order.id,
    version: order.version,
    userId: order.userId,
    occurredAt: order.updatedAt,
    payload: toOrder(order),
  }
  publish(event)
}

const scheduledOrders = new Set<string>()

function scheduleSettle(orderId: string, status: 'confirmed' | 'declined', delayMs: number) {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order) return
  order.settleAt = Date.now() + delayMs
  order.settleStatus = status
  saveDb()
  queueSettle(orderId)
}

function queueSettle(orderId: string) {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending' || !order.settleAt || !order.settleStatus) return
  const remaining = order.settleAt - Date.now()
  if (remaining <= 0) {
    settle(orderId, order.settleStatus)
    return
  }
  if (scheduledOrders.has(orderId)) return
  scheduledOrders.add(orderId)
  const status = order.settleStatus
  window.setTimeout(() => {
    scheduledOrders.delete(orderId)
    settle(orderId, status)
  }, remaining)
}

function toOrder(order: OrderRecord): Order {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    version: order.version,
    quoteId: order.quoteId,
    walletId: order.walletId,
    network: order.network,
    collectorName: order.collectorName,
    collectorEmail: order.collectorEmail,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    networkFee: order.networkFee,
    total: order.total,
    txRef: order.txRef,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

function applyNftEvent(event: Extract<RealtimeEvent, { type: 'nft.updated' }>) {
  const nft = db.nfts.find((item) => item.id === event.resourceId)
  if (!nft || event.version <= nft.version) return
  nft.version = event.version
  nft.title = event.payload.title
  for (const edition of nft.editions) {
    const price = event.payload.priceByEdition[edition.id]
    const available = event.payload.availableByEdition[edition.id]
    if (price) edition.price = price
    if (available != null) edition.available = available
  }
  saveDb()
}

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Informe seu nome'),
})

const profileSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.email(),
  bio: z.string().max(180),
  avatarUrl: z.string().nullable(),
})

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: passwordSchema,
})

const walletBodySchema = z.object({
  label: z.string().min(2, 'Informe um nome'),
  address: addressSchema,
  network: networkSchema,
  isPrimary: z.boolean(),
})

const cartItemBodySchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})

const couponBodySchema = z.object({
  couponCode: z.string().nullable(),
})

const quoteBodySchema = z.object({
  network: networkSchema,
})

const orderBodySchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: networkSchema,
  collectorName: z.string().min(2),
  collectorEmail: z.email(),
})

async function read<T>(request: Request, schema: z.ZodType<T>) {
  const body: unknown = await request.json().catch(() => null)
  return schema.safeParse(body)
}

export const handlers = [
  market.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const live: LiveConnection = {
      userId: null,
      emit: (event, payload) => {
        io.client.emit(event, payload)
      },
    }
    const remove = registerConnection(live)
    io.client.on('session.sync', (_message, token: unknown) => {
      bindUser(typeof token === 'string' ? token : null, live)
    })
    connection.client.addEventListener('close', () => {
      remove()
    })
  }),

  http.post('/api/__control/reset', () => {
    resetDb()
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/__control/scenario', async ({ request }) => {
    const body = await read(request, z.object({ scenario: scenarioSchema }))
    if (!body.success) return fail(422, 'validation', 'Cenário desconhecido')
    db.scenario = body.data.scenario
    saveDb()
    return HttpResponse.json({ scenario: db.scenario })
  }),

  http.post('/api/__control/clock', async ({ request }) => {
    const body = await read(request, z.object({ now: z.number() }))
    if (!body.success) return fail(422, 'validation', 'Relógio inválido')
    db.clock = body.data.now
    saveDb()
    return HttpResponse.json({ now: db.clock })
  }),

  http.post('/api/__control/emit', async ({ request }) => {
    const body = await read(request, z.object({ event: realtimeEventSchema }))
    if (!body.success) return fail(422, 'validation', 'Evento inválido')
    if (body.data.event.type === 'nft.updated') applyNftEvent(body.data.event)
    publish(body.data.event)
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await read(request, registerSchema)
    if (!body.success) return fail(422, 'validation', 'Revise os campos do cadastro')
    if (db.scenario === 'register_conflict' || db.users.some((user) => user.email === body.data.email)) {
      return fail(409, 'conflict', 'Já existe uma conta com esse e-mail', {
        email: 'E-mail já cadastrado',
      })
    }
    const user = {
      id: crypto.randomUUID(),
      name: body.data.name,
      email: body.data.email,
      passwordHash: simulatedPasswordHash(body.data.password),
      avatarUrl: null,
      bio: '',
    }
    db.users.push(user)
    const guestId = request.headers.get('x-guest-id')
    if (guestId) mergeGuestCart(guestId, user.id)
    const session = issueSession(user.id)
    saveDb()
    return HttpResponse.json(session, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await read(request, loginSchema)
    if (!body.success) return fail(422, 'validation', 'Informe e-mail e senha')
    const user = db.users.find((item) => item.email === body.data.email)
    if (!user || user.passwordHash !== simulatedPasswordHash(body.data.password)) {
      return fail(401, 'unauthorized', 'E-mail ou senha incorretos')
    }
    const guestId = request.headers.get('x-guest-id')
    if (guestId) mergeGuestCart(guestId, user.id)
    const session = issueSession(user.id)
    saveDb()
    return HttpResponse.json(session)
  }),

  http.get('/api/auth/session', ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Sessão inválida')
    const session = db.sessions.find((item) => item.userId === current.user?.id)
    if (!session) return fail(401, 'unauthorized', 'Sessão inválida')
    return HttpResponse.json({
      token: session.token,
      expiresAt: iso(session.expiresAt),
      user: publicUser(current.user),
    })
  }),

  http.post('/api/auth/logout', ({ request }) => {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    db.sessions = db.sessions.filter((item) => item.token !== token)
    saveDb()
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/highlights', async ({ request }) => {
    const blocked = await maybeDelay(request, 'catalog')
    if (blocked) return blocked
    const items = db.scenario === 'empty' ? [] : db.nfts.filter((nft) => nft.featured)
    return HttpResponse.json({ items })
  }),

  http.get('/api/nfts', async ({ request }) => {
    const blocked = await maybeDelay(request, 'catalog')
    if (blocked) return blocked
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const sort = url.searchParams.get('sort') ?? 'recent'
    const page = Number(url.searchParams.get('page') ?? '1') || 1
    const collections = (url.searchParams.get('collections') ?? '').split(',').filter(Boolean)
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const availability = url.searchParams.get('availability') ?? 'all'
    const filtered = db.nfts.filter((nft) => {
      if (db.scenario === 'empty') return false
      const haystack = `${nft.title} ${nft.collection} ${nft.creator}`.toLowerCase()
      if (q && !haystack.includes(q)) return false
      if (collections.length > 0 && !collections.includes(nft.collection)) return false
      const price = nft.editions[0]?.price ?? '0'
      if (minPrice && compare(price, minPrice) < 0) return false
      if (maxPrice && compare(price, maxPrice) > 0) return false
      if (availability === 'available' && !nft.editions.some((edition) => edition.available > 0)) return false
      return true
    })
    const items = [...filtered].sort((left, right) => {
      if (sort === 'price_asc') return compare(left.editions[0]?.price ?? '0', right.editions[0]?.price ?? '0')
      if (sort === 'price_desc') return compare(right.editions[0]?.price ?? '0', left.editions[0]?.price ?? '0')
      return right.createdAt.localeCompare(left.createdAt)
    })
    const start = (page - 1) * PAGE_SIZE
    return HttpResponse.json({
      items: items.slice(start, start + PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: items.length,
    })
  }),

  http.get('/api/nfts/:nftId', async ({ request, params }) => {
    const blocked = await maybeDelay(request, 'catalog')
    if (blocked) return blocked
    const nft = db.nfts.find((item) => item.id === params.nftId)
    if (!nft) return fail(404, 'not_found', 'NFT não encontrado')
    return HttpResponse.json(nft)
  }),

  http.get('/api/favorites', ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para ver os favoritos')
    return HttpResponse.json({
      nftIds: db.favorites.filter((item) => item.userId === current.user?.id).map((item) => item.nftId),
    })
  }),

  http.put('/api/favorites/:nftId', ({ request, params }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para favoritar')
    if (db.scenario === 'favorite_error') return fail(503, 'transient', 'Não foi possível salvar o favorito')
    const nftId = String(params.nftId)
    if (!db.nfts.some((nft) => nft.id === nftId)) return fail(404, 'not_found', 'NFT não encontrado')
    if (!db.favorites.some((item) => item.userId === current.user?.id && item.nftId === nftId)) {
      db.favorites.push({ userId: current.user.id, nftId })
    }
    saveDb()
    return HttpResponse.json({
      nftIds: db.favorites.filter((item) => item.userId === current.user?.id).map((item) => item.nftId),
    })
  }),

  http.delete('/api/favorites/:nftId', ({ request, params }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para alterar favoritos')
    if (db.scenario === 'favorite_error') return fail(503, 'transient', 'Não foi possível remover o favorito')
    const nftId = String(params.nftId)
    db.favorites = db.favorites.filter((item) => !(item.userId === current.user?.id && item.nftId === nftId))
    saveDb()
    return HttpResponse.json({
      nftIds: db.favorites.filter((item) => item.userId === current.user?.id).map((item) => item.nftId),
    })
  }),

  http.get('/api/cart', async ({ request }) => {
    if (db.scenario === 'slow') await wait(1200, request.signal)
    const current = principal(request)
    return HttpResponse.json(presentCart(current.ownerId))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const current = principal(request)
    const body = await read(request, cartItemBodySchema)
    if (!body.success) return fail(422, 'validation', 'Item inválido')
    const { nft, edition } = findEdition(body.data.nftId, body.data.editionId)
    if (!nft || !edition) return fail(404, 'not_found', 'Edição não encontrada')
    if (edition.available <= 0) return fail(409, 'unavailable', 'Edição esgotada')
    const cart = cartFor(current.ownerId)
    const existing = cart.items.find(
      (item) => item.nftId === body.data.nftId && item.editionId === body.data.editionId,
    )
    const nextQuantity = (existing?.quantity ?? 0) + body.data.quantity
    if (nextQuantity > edition.available) {
      return fail(409, 'unavailable', `Há ${edition.available} unidades disponíveis`)
    }
    if (existing) existing.quantity = nextQuantity
    else cart.items.push(body.data)
    cart.version += 1
    saveDb()
    return HttpResponse.json(presentCart(current.ownerId))
  }),

  http.patch('/api/cart/items/:editionId', async ({ request, params }) => {
    const current = principal(request)
    const body = await read(request, z.object({ quantity: z.number().int().positive() }))
    if (!body.success) return fail(422, 'validation', 'Quantidade inválida')
    const cart = cartFor(current.ownerId)
    const line = cart.items.find((item) => item.editionId === params.editionId)
    if (!line) return fail(404, 'not_found', 'Item não está no carrinho')
    const { edition } = findEdition(line.nftId, line.editionId)
    if (!edition || body.data.quantity > edition.available) {
      return fail(409, 'unavailable', 'Quantidade acima da disponibilidade')
    }
    line.quantity = body.data.quantity
    cart.version += 1
    saveDb()
    return HttpResponse.json(presentCart(current.ownerId))
  }),

  http.delete('/api/cart/items/:editionId', ({ request, params }) => {
    const current = principal(request)
    const cart = cartFor(current.ownerId)
    cart.items = cart.items.filter((item) => item.editionId !== params.editionId)
    cart.version += 1
    saveDb()
    return HttpResponse.json(presentCart(current.ownerId))
  }),

  http.patch('/api/cart/coupon', async ({ request }) => {
    const current = principal(request)
    const body = await read(request, couponBodySchema)
    if (!body.success) return fail(422, 'validation', 'Cupom inválido')
    const status = couponStatus(body.data.couponCode)
    if (status === 'invalid') return fail(422, 'coupon_invalid', 'Cupom inválido', { couponCode: 'Cupom inválido' })
    if (status === 'expired') return fail(422, 'coupon_expired', 'Cupom expirado', { couponCode: 'Cupom expirado' })
    const cart = cartFor(current.ownerId)
    cart.couponCode = body.data.couponCode
    cart.version += 1
    saveDb()
    return HttpResponse.json(presentCart(current.ownerId))
  }),

  http.post('/api/quotes', async ({ request }) => {
    if (db.scenario === 'slow') await wait(1200, request.signal)
    const current = principal(request)
    const body = await read(request, quoteBodySchema)
    if (!body.success) return fail(422, 'validation', 'Rede inválida')
    const quote = quoteFromCart(current.ownerId, body.data.network)
    if (quote instanceof Response) return quote
    return HttpResponse.json(quote)
  }),

  http.post('/api/orders', async ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para concluir a compra')
    const key = request.headers.get('idempotency-key')
    if (!key) return fail(400, 'validation', 'Informe a chave de idempotência')
    const body = await read(request, orderBodySchema)
    if (!body.success) return fail(422, 'validation', 'Revise os dados da compra')
    const hash = JSON.stringify(body.data)
    const previous = db.idempotency.find((item) => item.key === key)
    if (previous) {
      if (previous.hash !== hash) return fail(409, 'idempotency_conflict', 'A chave já foi usada em outro pedido')
      const existing = db.orders.find((item) => item.id === previous.orderId)
      if (!existing) return fail(404, 'not_found', 'Pedido não encontrado')
      return HttpResponse.json(toOrder(existing))
    }
    const quote = db.quotes.find((item) => item.quoteId === body.data.quoteId && item.ownerId === current.user?.id)
    if (!quote) return fail(404, 'not_found', 'Cotação não encontrada')
    if (Date.parse(quote.expiresAt) <= db.clock) return fail(409, 'quote_stale', 'A cotação expirou')
    if (!quoteIsCurrent(quote) || db.scenario === 'sold_out') {
      return fail(409, db.scenario === 'sold_out' ? 'unavailable' : 'quote_stale', 'A cotação mudou. Atualize antes de pagar')
    }
    const wallet = db.wallets.find((item) => item.id === body.data.walletId && item.userId === current.user?.id)
    if (!wallet) return fail(422, 'validation', 'Selecione uma carteira cadastrada', { walletId: 'Carteira não encontrada' })
    const now = iso()
    const order: OrderRecord = {
      ...quote,
      id: crypto.randomUUID(),
      userId: current.user.id,
      status: 'pending',
      version: 1,
      walletId: wallet.id,
      network: body.data.network,
      collectorName: body.data.collectorName,
      collectorEmail: body.data.collectorEmail,
      txRef: null,
      createdAt: now,
      updatedAt: now,
    }
    db.orders.push(order)
    db.idempotency.push({ key, hash, orderId: order.id })
    saveDb()
    if (db.scenario === 'payment_declined') scheduleSettle(order.id, 'declined', 400)
    else if (db.scenario === 'payment_pending') scheduleSettle(order.id, 'confirmed', 3000)
    else scheduleSettle(order.id, 'confirmed', 400)
    if (db.scenario === 'order_timeout') {
      try {
        await wait(8000, request.signal)
      } catch {
        return fail(503, 'transient', 'Timeout da simulação')
      }
    }
    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  http.get('/api/orders/:orderId', ({ request, params }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para ver o pedido')
    const order = db.orders.find((item) => item.id === params.orderId && item.userId === current.user?.id)
    if (!order) return fail(404, 'not_found', 'Pedido não encontrado')
    queueSettle(order.id)
    const currentOrder = db.orders.find((item) => item.id === order.id) ?? order
    return HttpResponse.json(toOrder(currentOrder))
  }),

  http.get('/api/profile', ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para ver o perfil')
    return HttpResponse.json({ ...publicUser(current.user), bio: current.user.bio })
  }),

  http.patch('/api/profile', async ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para editar o perfil')
    const body = await read(request, profileSchema)
    if (!body.success) return fail(422, 'validation', 'Revise o perfil')
    if (body.data.avatarUrl && body.data.avatarUrl.length > 200_000) {
      return fail(422, 'validation', 'A imagem do avatar é grande demais', { avatarUrl: 'Use uma imagem menor' })
    }
    if (db.users.some((user) => user.email === body.data.email && user.id !== current.user?.id)) {
      return fail(409, 'conflict', 'E-mail já usado', { email: 'E-mail já cadastrado' })
    }
    current.user.name = body.data.name
    current.user.email = body.data.email
    current.user.bio = body.data.bio
    current.user.avatarUrl = body.data.avatarUrl
    saveDb()
    return HttpResponse.json({ ...publicUser(current.user), bio: current.user.bio })
  }),

  http.post('/api/profile/password', async ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para alterar a senha')
    const body = await read(request, passwordChangeSchema)
    if (!body.success) {
      return fail(422, 'validation', 'Revise a senha', { nextPassword: 'Use pelo menos 8 caracteres' })
    }
    if (current.user.passwordHash !== simulatedPasswordHash(body.data.currentPassword)) {
      return fail(422, 'validation', 'Senha atual incorreta', { currentPassword: 'Senha atual incorreta' })
    }
    current.user.passwordHash = simulatedPasswordHash(body.data.nextPassword)
    saveDb()
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/wallets', ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para ver as carteiras')
    return HttpResponse.json({
      items: db.wallets
        .filter((wallet) => wallet.userId === current.user?.id)
        .map(({ userId: _userId, ...wallet }) => wallet),
    })
  }),

  http.post('/api/wallets', async ({ request }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para cadastrar uma carteira')
    const body = await read(request, walletBodySchema)
    if (!body.success) return fail(422, 'validation', 'Revise a carteira', { address: 'Endereço inválido' })
    const wallet = { id: crypto.randomUUID(), userId: current.user.id, ...body.data }
    if (wallet.isPrimary) {
      for (const item of db.wallets) {
        if (item.userId === current.user?.id) item.isPrimary = false
      }
    }
    db.wallets.push(wallet)
    saveDb()
    const { userId: _userId, ...publicWallet } = wallet
    return HttpResponse.json(publicWallet, { status: 201 })
  }),

  http.patch('/api/wallets/:walletId', async ({ request, params }) => {
    const current = principal(request)
    if (!current.user) return fail(401, 'unauthorized', 'Entre para editar a carteira')
    const body = await read(request, walletBodySchema)
    if (!body.success) return fail(422, 'validation', 'Revise a carteira', { address: 'Endereço inválido' })
    const wallet = db.wallets.find((item) => item.id === params.walletId && item.userId === current.user?.id)
    if (!wallet) return fail(404, 'not_found', 'Carteira não encontrada')
    if (body.data.isPrimary) {
      for (const item of db.wallets) {
        if (item.userId === current.user?.id) item.isPrimary = false
      }
    }
    wallet.label = body.data.label
    wallet.address = body.data.address
    wallet.network = body.data.network
    wallet.isPrimary = body.data.isPrimary
    saveDb()
    const { userId: _userId, ...publicWallet } = wallet
    return HttpResponse.json(publicWallet)
  }),
]
