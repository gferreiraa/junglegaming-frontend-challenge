import { expect, test } from '@playwright/test'
import { login, resetApp } from './support'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await resetApp(page)
  await login(page)
})

test('perfil, avatar, senha e carteiras', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('main').getByLabel('Nome').fill('Maya Atualizada')
  await page.getByRole('main').getByLabel('Avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByAltText('Avatar atual')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText('Perfil atualizado')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('main').getByLabel('Nome')).toHaveValue('Maya Atualizada')
  await expect(page.getByAltText('Avatar atual')).toBeVisible()

  await page.getByRole('main').getByLabel('Senha atual').fill('errada123')
  await page.getByRole('main').getByLabel('Nova senha').fill('password1234')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('Senha atual incorreta')).toBeVisible()
  await page.getByRole('main').getByLabel('Senha atual').fill('password123')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('Senha alterada')).toBeVisible()

  await page.goto('/wallets')
  await page.getByRole('main').getByLabel('Endereço').fill('0x123')
  await page.getByRole('main').getByLabel('Nome').fill('Fria')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()
  await page.getByRole('main').getByLabel('Endereço').fill('0x3333333333333333333333333333333333333333')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Fria · secundária')).toBeVisible()
  await page.getByRole('button', { name: 'Editar' }).last().click()
  await page.getByRole('main').getByLabel('Nome').fill('Fria editada')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Fria editada')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Fria editada')).toBeVisible()
})
