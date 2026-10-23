import { expect, test, type Page } from '@playwright/test'
import { addDewdrop, emit, login, resetApp, setScenario } from './support'

// Lacunas da camada funcional (REST + MSW + Socket.IO). Os valores esperados são escritos à mão,
// sem reutilizar o cálculo da aplicação.

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

async function addPiece(page: Page, nftId: string) {
  await page.goto(`/nfts/${nftId}`)
  await page.getByRole('main').getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Item adicionado ao carrinho')).toBeVisible()
}

test('0.1 + 0.2 fecha em 0.3 com cupom e taxa, e a API transporta strings decimais', async ({ page }) => {
  await addPiece(page, 'nft-01')
  await addPiece(page, 'nft-02')
  const quoteResponse = page.waitForResponse((response) => response.url().includes('/api/quotes') && response.ok())
  await page.goto('/cart')
  const quote = (await (await quoteResponse).json()) as Record<string, unknown>
  for (const field of ['subtotal', 'discount', 'networkFee', 'total']) expect(typeof quote[field], field).toBe('string')
  await expect(page.getByTestId('subtotal')).toHaveText('0.3 ETH')
  await page.getByRole('main').getByLabel('Cupom').fill('WELCOME10')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(page.getByTestId('discount')).toHaveText('0.03 ETH')
  await expect(page.getByTestId('fee')).toHaveText('0.002 ETH')
  await expect(page.getByTestId('total')).toHaveText('0.272 ETH')
})

test('pedido de um usuário não é acessível por outro', async ({ page }) => {
  await login(page)
  await addDewdrop(page)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  const orderUrl = page.url()
  const orderId = orderUrl.split('/orders/')[1]
  expect(orderId).toBeTruthy()

  await page.evaluate(() => localStorage.removeItem('marketplace-token'))
  await login(page, 'ada@example.com')
  const status = await page.evaluate(async (id) => {
    const token = localStorage.getItem('marketplace-token')
    const response = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    return response.status
  }, orderId)
  expect(status).toBe(404)
  await page.goto(orderUrl)
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  await expect(page.getByTestId('receipt')).toHaveCount(0)
})

test('senha não fica em claro no storage nem no console', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (message) => logs.push(message.text()))
  const secret = 'SenhaAuditoria#2026'
  const email = `qa-${Date.now()}@example.com`
  await page.goto('/register')
  const form = page.getByRole('main')
  await form.getByLabel('Nome').fill('QA Auditoria')
  await form.getByLabel('E-mail').fill(email)
  await form.getByLabel('Senha').fill(secret)
  await form.getByRole('button', { name: 'Criar conta' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/register'))
  const dump = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(dump).not.toContain(secret)
  expect(logs.join('\n')).not.toContain(secret)
})

test('recibo confirmado não muda quando o catálogo muda depois', async ({ page }) => {
  await login(page)
  await addDewdrop(page)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveText('Total 0.102 ETH')
  await emit(page, {
    id: 'evt-after-purchase',
    type: 'nft.updated',
    resourceId: 'nft-01',
    version: 9,
    occurredAt: '2026-01-15T12:30:00.000Z',
    payload: {
      title: 'Dewdrop renomeado',
      priceByEdition: { 'nft-01-original': '5.00', 'nft-01-proof': '9.00' },
      availableByEdition: { 'nft-01-original': 8, 'nft-01-proof': 1 },
    },
  })
  await page.reload()
  await expect(page.getByTestId('receipt-total')).toHaveText('Total 0.102 ETH')
  await expect(page.getByTestId('receipt')).toContainText('Dewdrop')
  await expect(page.getByTestId('receipt')).not.toContainText('renomeado')
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
})

test('item adicionado durante pedido pendente continua no carrinho após a confirmação', async ({ page }) => {
  await login(page)
  await addDewdrop(page)
  await setScenario(page, 'payment_pending')
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByTestId('order-status')).toContainText('pending')
  const orderUrl = page.url()
  await addPiece(page, 'nft-02')
  await page.goto(orderUrl)
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible({ timeout: 15_000 })
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Amber Lantern' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toHaveCount(0)
})

test('order.updated de outro usuário não chega à sessão atual', async ({ page }) => {
  await login(page)
  await addDewdrop(page)
  await setScenario(page, 'payment_pending')
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByTestId('order-status')).toContainText('pending')
  const orderId = page.url().split('/orders/')[1]
  const order = await page.evaluate(async (id) => {
    const token = localStorage.getItem('marketplace-token')
    const response = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    return (await response.json()) as Record<string, unknown>
  }, orderId)
  await emit(page, {
    id: 'evt-foreign-order',
    type: 'order.updated',
    resourceId: orderId,
    userId: 'user-ada',
    version: 50,
    occurredAt: '2026-01-15T12:10:00.000Z',
    payload: { ...order, status: 'declined', version: 50 },
  })
  await expect(page.getByTestId('order-status')).toContainText('pending')
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toHaveCount(0)
})
