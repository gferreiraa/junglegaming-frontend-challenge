import { expect, test } from '@playwright/test'
import { addDewdrop, login, resetApp } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test('quantidades, cupom, remoção, refresh e login', async ({ page }) => {
  await addDewdrop(page)
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()

  await page.getByRole('main').getByLabel('Cupom').fill('WELCOME10')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(page.getByText('Cupom aplicado: WELCOME10')).toBeVisible()
  await expect(page.getByTestId('discount')).not.toHaveText('0 ETH')

  await page.getByRole('main').getByLabel('Cupom').fill('EXPIRED')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(page.getByRole('alert')).toContainText('expirado')

  await page.getByRole('main').getByLabel('Cupom').fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(page.getByRole('alert')).toContainText('inválido')

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByText('Cupom aplicado:')).toHaveCount(0)

  await login(page)
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()

  await page.getByRole('button', { name: 'Remover' }).click()
  await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
})
