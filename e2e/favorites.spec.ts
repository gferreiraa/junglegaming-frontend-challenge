import { expect, test } from '@playwright/test'
import { login, resetApp, setScenario } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
  await login(page)
})

test('favorito falha, restaura e depois persiste', async ({ page }) => {
  await setScenario(page, 'favorite_error')
  await page.goto('/nfts/nft-01')
  await page.getByRole('button', { name: 'Favoritar' }).click()
  await expect(page.getByText('Não foi possível atualizar o favorito')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Favoritar' })).toBeVisible()

  await setScenario(page, 'default')
  await page.getByRole('button', { name: 'Favoritar' }).click()
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
})
