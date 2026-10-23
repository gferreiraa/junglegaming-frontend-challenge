import { expect, test } from '@playwright/test'
import { resetApp, setScenario } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

async function checkCollection(page: import('@playwright/test').Page, name: string) {
  const catalog = page.getByRole('region', { name: 'Catálogo' })
  await expect(catalog).toBeVisible()
  const filters = page.getByRole('button', { name: 'Filtros' })
  if (await filters.isVisible()) {
    await filters.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('checkbox', { name }).check()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    return
  }
  await catalog.getByRole('checkbox', { name }).check()
}

test('busca, filtros, ordenação, paginação e histórico', async ({ page }) => {
  await page.goto('/nfts')
  await page.getByLabel('Buscar NFTs').fill('Moss')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/q=Moss/)
  await expect(page.getByRole('heading', { name: 'Moss King' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toHaveCount(0)

  await page.goto('/nfts')
  await checkCollection(page, 'Genesis')
  await expect(page).toHaveURL(/collections=Genesis/)
  const catalog = page.getByRole('region', { name: 'Catálogo' })
  await expect(catalog.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()
  await expect(catalog.getByRole('heading', { name: 'Aurora Elk' })).toHaveCount(0)

  await checkCollection(page, 'Aurora')
  await expect(page).toHaveURL(/Genesis/)
  await expect(page).toHaveURL(/Aurora/)
  await expect(catalog.getByRole('heading', { name: 'Aurora Elk' })).toBeVisible()

  await page.goto('/nfts?page=2')
  await checkCollection(page, 'Genesis')
  await expect(page).not.toHaveURL(/page=2/)

  await page.goto('/nfts')
  await page.getByLabel('Ordenar').selectOption('price_asc')
  await expect(page).toHaveURL(/sort=price_asc/)
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(catalog.getByRole('heading', { name: 'Silent Orchid' })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('region', { name: 'Catálogo' }).getByRole('heading', { name: 'Silent Orchid' })).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/page=2/)
  await expect(page.getByRole('heading', { name: 'Dewdrop' })).toBeVisible()
})

test('resultado vazio, falha e nova tentativa', async ({ page }) => {
  await page.goto('/nfts')
  await page.getByLabel('Buscar NFTs').fill('zzzz-nada')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible()

  await page.goto('/nfts')
  await expect(page.getByRole('region', { name: 'Catálogo' }).getByRole('heading', { name: 'Silent Orchid' })).toBeVisible()
  await setScenario(page, 'server_error')
  await page.reload()
  await expect(page.getByText('Não foi possível carregar os dados.').first()).toBeVisible()
  await setScenario(page, 'default')
  await page.getByRole('region', { name: 'Catálogo' }).getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('region', { name: 'Catálogo' }).getByRole('heading', { name: 'Silent Orchid' })).toBeVisible()
})

test('skeleton durante carregamento lento', async ({ page }) => {
  await page.goto('/nfts')
  await setScenario(page, 'slow')
  await page.reload()
  await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Catálogo' }).getByRole('heading', { name: 'Silent Orchid' })).toBeVisible()
})
