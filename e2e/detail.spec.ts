import { expect, test } from '@playwright/test'
import { resetApp } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test('acesso direto ao detalhe e NFT inexistente', async ({ page }) => {
  await page.goto('/nfts/nft-01')
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Original' })).toBeVisible()
  await page.goto('/nfts/nao-existe')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('edição esgotada não entra no carrinho', async ({ page }) => {
  await page.goto('/nfts/nft-12')
  await page.getByRole('radio', { name: /Artist proof/ }).check()
  await expect(page.getByText('Esta edição está indisponível.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeDisabled()
})
