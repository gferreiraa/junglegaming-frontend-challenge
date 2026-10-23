import { expect, test } from '@playwright/test'
import { addDewdrop, emit, login, resetApp, setScenario } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
  await login(page)
  await addDewdrop(page)
})

test('preço muda no checkout e exige nova confirmação', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-total')).toContainText('0.102 ETH')
  await emit(page, {
    id: 'evt-price-1',
    type: 'nft.updated',
    resourceId: 'nft-01',
    version: 2,
    occurredAt: '2026-01-15T12:05:00.000Z',
    payload: {
      title: 'Dewdrop',
      priceByEdition: { 'nft-01-original': '0.99', 'nft-01-proof': '1.25' },
      availableByEdition: { 'nft-01-original': 8, 'nft-01-proof': 1 },
    },
  })
  await expect(page.getByText('A cotação mudou')).toBeVisible()
  await expect(page.getByTestId('checkout-total')).toContainText('0.992 ETH')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar nova cotação' }).click()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
})

test('preço muda no pagamento do KURIO e exige nova confirmação', async ({ page }) => {
  await page.goto('/pagamento')
  await expect(page.getByText('0.102 ETH').filter({ visible: true }).first()).toBeVisible()
  await emit(page, {
    id: 'evt-price-kurio',
    type: 'nft.updated',
    resourceId: 'nft-01',
    version: 2,
    occurredAt: '2026-01-15T12:05:00.000Z',
    payload: {
      title: 'Dewdrop',
      priceByEdition: { 'nft-01-original': '0.99', 'nft-01-proof': '1.25' },
      availableByEdition: { 'nft-01-original': 8, 'nft-01-proof': 1 },
    },
  })
  await expect(page.getByText('A cotação mudou').filter({ visible: true })).toBeVisible()
  await expect(page.getByText('0.992 ETH').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar nova cotação' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
})

test('evento duplicado ou antigo não regride o preço', async ({ page }) => {
  await page.goto('/cart')
  await expect(page.getByTestId('line-price-nft-01')).toContainText('0.1 ETH')
  const event = {
    id: 'evt-dup',
    type: 'nft.updated',
    resourceId: 'nft-01',
    version: 4,
    occurredAt: '2026-01-15T12:06:00.000Z',
    payload: {
      title: 'Dewdrop',
      priceByEdition: { 'nft-01-original': '0.77', 'nft-01-proof': '1.25' },
      availableByEdition: { 'nft-01-original': 8, 'nft-01-proof': 1 },
    },
  }
  await emit(page, event)
  await emit(page, event)
  await expect(page.getByTestId('line-price-nft-01')).toContainText('0.77 ETH')
  await emit(page, { ...event, id: 'evt-old', version: 1, payload: { ...event.payload, priceByEdition: { 'nft-01-original': '0.01', 'nft-01-proof': '1.25' } } })
  await expect(page.getByTestId('line-price-nft-01')).toContainText('0.77 ETH')
})

test('desconexão recupera o pedido pendente sem criar outro', async ({ page }) => {
  await setScenario(page, 'payment_pending')
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByTestId('order-status')).toContainText('pending')
  const orderUrl = page.url()
  await page.context().setOffline(true)
  await page.context().setOffline(false)
  await page.reload()
  await expect(page).toHaveURL(orderUrl)
  await expect(page.getByRole('heading', { name: 'Compra confirmada' })).toBeVisible()
})
