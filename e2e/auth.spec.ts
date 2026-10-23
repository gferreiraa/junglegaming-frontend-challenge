import { expect, test } from '@playwright/test'
import { login, resetApp } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test('cadastro, conflito, login, logout e troca de usuário', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('main').getByLabel('Nome').fill('Nova Pessoa')
  await page.getByRole('main').getByLabel('E-mail').fill('collector@example.com')
  await page.getByRole('main').getByLabel('Senha').fill('password123')
  await page.getByRole('main').getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('E-mail já cadastrado')).toBeVisible()

  const email = `nova-${Date.now()}@example.com`
  await page.getByRole('main').getByLabel('E-mail').fill(email)
  await page.getByRole('main').getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: /Seja dono/ })).toBeVisible()
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('link', { name: 'Perfil' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' }).or(page.getByRole('link', { name: 'Entrar' }))).toBeVisible()

  await login(page)
  await page.goto('/nfts/nft-05')
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.goto('/perfil')
  await page.getByRole('button', { name: 'Sair' }).click()
  await login(page, 'ada@example.com')
  await page.goto('/nfts/nft-05')
  await expect(page.getByRole('button', { name: 'Favoritar' })).toBeVisible()
  await page.goto('/nfts/nft-08')
  await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
})

test('sessão expirada devolve ao login e preserva o destino', async ({ page }) => {
  await login(page)
  await page.evaluate(async () => {
    await fetch('/api/__control/clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ now: Date.parse('2026-01-15T18:00:00.000Z') }),
    })
  })
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
  await expect(page).toHaveURL(/redirect=/)
  await page.getByRole('main').getByLabel('E-mail').fill('collector@example.com')
  await page.getByRole('main').getByLabel('Senha').fill('password123')
  await page.getByRole('main').getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Perfil', exact: true })).toBeVisible()
})

test('validação de login associa o erro ao campo', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('main').getByRole('button', { name: 'Entrar' }).click()
  const email = page.getByRole('main').getByLabel('E-mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert').first()).toBeVisible()
})
