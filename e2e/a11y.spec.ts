import { expect, test } from '@playwright/test'
import { login, resetApp } from './support'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test('sem overflow em tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(overflow).toBe(false)
})

test('foco do diálogo de filtros no mobile', async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 390, 'o gatilho de filtros fica só no mobile')
  await page.goto('/nfts')
  const trigger = page.getByRole('button', { name: 'Filtros' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect.poll(async () => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') != null)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('foco do diálogo de taxa no checkout', async ({ page }) => {
  await login(page)
  await page.goto('/checkout')
  const trigger = page.getByRole('button', { name: 'Como a taxa é calculada' })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})
