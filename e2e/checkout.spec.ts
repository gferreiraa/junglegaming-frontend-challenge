import { expect, test } from '@playwright/test'
import { addDewdrop, login, resetApp, setScenario } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
  await login(page)
  await addDewdrop(page)
})

async function openCheckout(page: import('@playwright/test').Page) {
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible()
  await expect(page.getByTestId('checkout-total')).toBeVisible()
}

test('compra completa até o recibo', async ({ page }) => {
  await openCheckout(page)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText('conectada')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  await expect(page.getByTestId('receipt')).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toBeVisible()
  const orderUrl = page.url()
  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  await page.goto(orderUrl)
  await expect(page.getByTestId('receipt-total')).toBeVisible()
})

test('recusa, clique repetido e timeout recuperam o mesmo pedido', async ({ page }) => {
  await setScenario(page, 'payment_declined')
  await openCheckout(page)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()

  await setScenario(page, 'default')
  await openCheckout(page)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  const confirm = page.getByRole('button', { name: 'Confirmar compra' })
  await confirm.dblclick()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
  const confirmed = page.url()

  await page.goto('/cart')
  await addDewdrop(page)
  await setScenario(page, 'order_timeout')
  await openCheckout(page)
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible({ timeout: 20_000 })
  expect(page.url()).not.toBe(confirmed)
})

test('conflito de idempotência', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const token = localStorage.getItem('marketplace-token')
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'chave-fixa',
    }
    const quoteResponse = await fetch('/api/quotes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ network: 'ethereum' }),
    })
    const quote = (await quoteResponse.json()) as { quoteId: string }
    const body = {
      quoteId: quote.quoteId,
      walletId: 'wallet-maya-primary',
      network: 'ethereum',
      collectorName: 'Maya Chen',
      collectorEmail: 'collector@example.com',
    }
    const first = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) })
    const firstBody = (await first.json()) as { id: string }
    const second = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, walletId: 'wallet-maya-secondary' }),
    })
    const same = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) })
    const sameBody = (await same.json()) as { id: string }
    return { first: first.status, second: second.status, same: same.status, firstId: firstBody.id, sameId: sameBody.id }
  })
  expect(result.first).toBe(201)
  expect(result.second).toBe(409)
  expect(result.same).toBe(200)
  expect(result.sameId).toBe(result.firstId)
})
