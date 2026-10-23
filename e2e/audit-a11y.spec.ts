import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { resetApp, setScenario } from './support'

const require = createRequire(import.meta.url)
const axePath = require.resolve('axe-core/axe.min.js', { paths: [require.resolve('lighthouse')] })

type AxeViolation = { id: string; impact: string | null; nodes: { target: string[] }[] }

async function axe(page: Page) {
  await page.addScriptTag({ path: axePath })
  return page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    }))
  })
}

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

for (const path of ['/', '/nft/emerald-ape-042', '/carrinho', '/pagamento', '/entrar', '/cadastro', '/perfil', '/perfil/carteiras']) {
  test(`axe WCAG 2.1 AA sem violações em ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('main')).toBeVisible()
    const violations = await axe(page)
    test.info().annotations.push({ type: 'axe', description: JSON.stringify(violations) })
    expect(violations).toEqual([])
  })
}

test('diálogo de login: foco inicial, contenção, Escape e retorno do foco', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'diálogo só existe no desktop')
  await page.goto('/')
  const trigger = page.getByRole('banner').getByRole('button', { name: 'Entrar' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') != null)).toBe(true)
  for (let index = 0; index < 25; index += 1) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') != null)).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('foco visível ao navegar por teclado no início', async ({ page }) => {
  await page.goto('/')
  const missing: string[] = []
  for (let index = 0; index < 15; index += 1) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null
      if (!element || element === document.body) return null
      const style = getComputedStyle(element)
      const ring = style.outlineStyle !== 'none' && style.outlineWidth !== '0px'
      const shadow = style.boxShadow !== 'none'
      return { label: element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 30) ?? element.tagName, visible: ring || shadow }
    })
    if (info && !info.visible) missing.push(info.label)
  }
  expect(missing).toEqual([])
})

test('skeleton com shimmer no detalhe sob latência e parado com reduced motion', async ({ page }) => {
  await setScenario(page, 'slow')
  await page.goto('/nfts/nft-01')
  const block = page.getByTestId('detail-skeleton').locator('.shimmer').first()
  await expect(block).toBeAttached()
  const moving = await block.evaluate((element) => {
    const style = getComputedStyle(element)
    return { animation: style.animationName, image: style.backgroundImage, height: element.getBoundingClientRect().height }
  })
  expect(moving.animation).toBe('shimmer')
  expect(moving.image).toContain('gradient')
  expect(moving.height).toBeGreaterThan(0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  const still = page.getByTestId('detail-skeleton').locator('.shimmer').first()
  await expect(still).toBeAttached()
  expect(await still.evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
})

test('telas visíveis mostram skeleton sob latência controlada', async ({ page }) => {
  await setScenario(page, 'slow')
  await page.goto('/nfts')
  await expect(page.getByRole('main').locator('[aria-busy="true"]').first()).toBeVisible()
})
