import { expect, test, type Page } from '@playwright/test'
import { login, resetApp } from './support'

// Rotas visíveis da interface KURIO (/, /nft/$id, /carrinho, /pagamento, /entrar, /cadastro).
// Cada teste observa as requisições reais do browser; nenhuma resposta é substituída.

function trackApi(page: Page) {
  const calls: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/__control')) {
      calls.push(`${request.method()} ${url.pathname}`)
    }
  })
  return calls
}

const main = (page: Page) => page.getByRole('main')
const visible = { visible: true } as const

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test('início mostra a home do KURIO', async ({ page }) => {
  await page.goto('/')
  await expect(main(page).getByRole('link', { name: /Emerald Ape/ }).first()).toBeVisible()
  await expect(main(page).getByText('Coleção simulada')).toHaveCount(0)
})

test('busca do início grava o termo na URL e filtra os resultados', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1024, 'no Figma a busca da home é o campo mobile')
  await page.goto('/')
  const search = main(page).getByRole('textbox', { name: /Explorar coleções|Buscar/ }).first()
  await search.fill('Ivory')
  await search.press('Enter')
  await expect(page).toHaveURL(/q=Ivory/)
})

test('login recusa credenciais inválidas consultando a API', async ({ page }) => {
  const calls = trackApi(page)
  await page.goto('/entrar')
  await main(page).getByLabel('E-mail', { exact: true }).filter(visible).fill('collector@example.com')
  await main(page).getByLabel('Senha', { exact: true }).filter(visible).fill('senha-errada-123')
  await main(page).locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(main(page).getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/entrar/)
  expect(calls).toContain('POST /api/auth/login')
})

test('cadastro associa rótulos aos campos de senha', async ({ page }) => {
  await page.goto('/cadastro')
  await expect(main(page).getByLabel('Senha', { exact: true }).filter(visible)).toHaveAttribute('type', 'password')
  await expect(main(page).getByLabel('Confirmar senha', { exact: true }).filter(visible)).toHaveAttribute('type', 'password')
})

test('cabeçalho reflete a sessão REST após login', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'cabeçalho só existe no desktop')
  await login(page)
  await page.goto('/')
  const banner = page.getByRole('banner')
  await expect(banner.getByRole('link', { name: 'KURIO' })).toBeVisible()
  await expect(banner.getByRole('link', { name: 'Maya Chen' })).toBeVisible()
  await expect(banner.getByRole('button', { name: 'Entrar' })).toHaveCount(0)
})

test('compra só é confirmada depois da resposta da simulação', async ({ page }) => {
  const calls = trackApi(page)
  await login(page)
  await page.goto('/nft/emerald-ape-042')
  if (page.viewportSize()!.width >= 1024) {
    await main(page).getByRole('button', { name: 'COMPRAR' }).click()
  } else {
    await main(page).getByRole('button', { name: 'Comprar NFT' }).click()
  }
  await expect(page).toHaveURL(/\/carrinho/)
  await page.goto('/pagamento')
  if (page.viewportSize()!.width >= 1024) {
    const form = main(page)
    await form.getByLabel('Nome de exibição').filter(visible).fill('Maya Chen')
    await form.getByLabel('Nome de usuário').filter(visible).fill('maya')
    await form.getByLabel('Rede').filter(visible).selectOption('Ethereum')
    await form.getByLabel('Nome do perfil').filter(visible).fill('Maya')
    await form.getByLabel('Endereço da carteira').filter(visible).fill('0x1111111111111111111111111111111111111111')
    await form.getByLabel('Tipo de carteira').filter(visible).selectOption('MetaMask')
    await form.getByLabel('Código de indicação').filter(visible).fill('ABC')
    await form.getByLabel('E-mail').filter(visible).fill('collector@example.com')
    // O input ENS não tem nome acessível (o rótulo aponta para o select de sufixo).
    await form.locator('input[name="ens"]').filter(visible).fill('maya')
  }
  await main(page).getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('dialog')).toContainText('Seus NFTs agora estão na sua carteira')
  expect(calls).toContain('POST /api/orders')
})

test('pagamento exige autenticação', async ({ page }) => {
  await page.goto('/pagamento')
  await expect(page).toHaveURL(/\/(entrar|login)/)
})

test('cupom WELCOME10 mantém o foco ao digitar e aplica desconto', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  if (page.viewportSize()!.width >= 1024) await main(page).getByRole('button', { name: 'COMPRAR' }).click()
  else await main(page).getByRole('button', { name: 'Comprar NFT' }).click()
  await expect(page).toHaveURL(/\/carrinho/)
  const coupon = main(page).getByLabel('Código promocional').filter(visible)
  await coupon.click()
  await coupon.pressSequentially('WELCOME10')
  await expect(coupon).toHaveValue('WELCOME10')
  await main(page).getByRole('button', { name: 'Aplicar' }).click()
  await expect(main(page).getByText('(-) 00.00').filter(visible)).toHaveCount(0)
})

test('quantidade respeita o estoque da edição', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'stepper desktop')
  await page.goto('/nft/emerald-ape-042')
  const plus = main(page).getByRole('button', { name: 'Aumentar quantidade' })
  await expect(plus).toBeEnabled()
  for (let index = 0; index < 7; index += 1) await plus.click()
  await expect(plus).toBeDisabled()
  await expect(main(page).locator('[aria-label="quantidade"]').filter(visible)).toHaveText(/8/)
})

test('favoritar exige sessão', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'botão desktop')
  await page.goto('/nft/emerald-ape-042')
  await main(page).getByRole('button', { name: 'Favoritar' }).filter(visible).first().click()
  await expect(page).toHaveURL(/\/(entrar|login)|auth=login/)
})

test('NFT inexistente mostra estado de não encontrado', async ({ page }) => {
  await page.goto('/nft/nao-existe')
  await expect(main(page).getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('painel de cenários de demonstração está acessível', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: /Cenários de demonstração/ }).or(page.getByRole('heading', { name: /Cenários de demonstração/ }))).toBeVisible()
})

test('rotas principais sem erros inesperados de console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  for (const path of ['/', '/nft/emerald-ape-042', '/carrinho', '/pagamento', '/entrar', '/cadastro', '/perfil', '/perfil/carteiras', '/nfts/nft-01', '/cart']) {
    await page.goto(path)
    await expect(main(page)).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('sem overflow horizontal em 390, 768 e 1440', async ({ page }) => {
  const offenders: string[] = []
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/nft/emerald-ape-042', '/carrinho', '/pagamento', '/entrar', '/perfil', '/perfil/carteiras']) {
      await page.goto(path)
      await expect(main(page)).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (overflow > 1) offenders.push(`${width}px ${path} +${overflow}px`)
    }
  }
  expect(offenders).toEqual([])
})
