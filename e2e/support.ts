import { expect, type Page } from '@playwright/test'

export async function resetApp(page: Page) {
  await page.goto('/')
  await page.waitForFunction(() => document.documentElement.dataset.msw === 'ready')
  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await fetch('/api/__control/reset', { method: 'POST' })
  })
  await page.reload()
  await page.waitForFunction(() => document.documentElement.dataset.msw === 'ready')
  await expect(page.locator('main#conteudo')).toBeVisible()
}

export async function login(page: Page, email = 'collector@example.com', password = 'password123') {
  await page.goto('/login')
  await page.getByRole('main').getByLabel('E-mail').fill(email)
  await page.getByRole('main').getByLabel('Senha').fill(password)
  await page.getByRole('main').getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

export async function setScenario(page: Page, scenario: string) {
  await page.waitForFunction(() => document.documentElement.dataset.msw === 'ready')
  await page.evaluate(async (name) => {
    const response = await fetch('/api/__control/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: name }),
    })
    if (!response.ok) throw new Error(`scenario failed ${response.status}`)
  }, scenario)
}

export async function emit(page: Page, event: unknown) {
  await page.waitForFunction(() => document.documentElement.dataset.msw === 'ready')
  await page.evaluate(async (payload) => {
    const response = await fetch('/api/__control/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: payload }),
    })
    if (!response.ok) throw new Error(`emit failed ${response.status}`)
  }, event)
}

export async function addDewdrop(page: Page) {
  await page.goto('/nfts/nft-01')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Item adicionado ao carrinho')).toBeVisible()
}
