import { expect, test } from '@playwright/test'
import { addDewdrop, login, resetApp } from './support'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await resetApp(page)
})

test('início', async ({ page }) => {
  await expect(page.getByRole('link', { name: /Emerald Ape/ }).first()).toBeVisible()
  await expect(page).toHaveScreenshot('home.png')
})

test('detalhe', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' }).filter({ visible: true })).toBeVisible()
  await expect(page).toHaveScreenshot('detail.png')
})

test('carrinho', async ({ page }) => {
  await addDewdrop(page)
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Resumo da carteira' }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText('Dewdrop').filter({ visible: true }).first()).toBeVisible()
  await expect(page).toHaveScreenshot('cart.png')
})

test('pagamento', async ({ page }) => {
  await login(page)
  await addDewdrop(page)
  await page.goto('/pagamento')
  await expect(page.getByRole('heading', { name: /Perfil do colecionador|Pagamento com carteira/ }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText('0.102 ETH').filter({ visible: true }).first()).toBeVisible()
  await expect(page).toHaveScreenshot('checkout.png')
})
