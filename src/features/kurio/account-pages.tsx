import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { controlClass, Field, PasswordInput } from '@/components/kurio/bits'
import { signOut } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { changePassword, createWallet, fetchProfile, updateProfile, updateWallet, fetchWallets } from '@/lib/api/marketplace'
import { cn } from '@/lib/utils'
import userIcon from '../../../design/icons/User.svg?url'
import locationIcon from '../../../design/icons/Location.svg?url'
import activityIcon from '../../../design/icons/Shop.svg?url'
import wishlistIcon from '../../../design/icons/Heart.svg?url'
import offersIcon from '../../../design/icons/Star.svg?url'
import downloadsIcon from '../../../design/icons/heart 1.svg?url'
import supportIcon from '../../../design/icons/Activity.svg?url'
import logoutIcon from '../../../design/icons/Logout.svg?url'
import imageIcon from '../../../design/icons/Download.svg?url'
import arrowDownIcon from '../../../design/icons/Arrow-Down.svg?url'

const fieldClass = cn(controlClass, 'h-10 rounded-[3px]')

const items: { to?: '/perfil' | '/perfil/carteiras'; label: string; icon: string }[] = [
  { to: '/perfil', label: 'Dados do perfil', icon: userIcon },
  { to: '/perfil/carteiras', label: 'Carteiras', icon: locationIcon },
  { label: 'Atividade', icon: activityIcon },
  { label: 'Lista de interesse', icon: wishlistIcon },
  { label: 'Ofertas', icon: offersIcon },
  { label: 'Arquivos baixados', icon: downloadsIcon },
  { label: 'Suporte', icon: supportIcon },
]

function SelectArrow() {
  return (
    <img
      src={arrowDownIcon}
      alt=""
      width={20}
      height={20}
      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
    />
  )
}

export function AccountFrame({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [limit, setLimit] = useState('')
  const nav = (
    <nav aria-label="Meu perfil" className="grid">
      {items.map((item) => {
        const active = item.to === path
        const className = cn(
          'btn btn-quiet flex items-center gap-3 border-l-[6px] px-4 py-3 text-left text-[15px] text-text-accent',
          active ? 'border-primary' : 'border-transparent',
        )
        if (!item.to) {
          return (
            <button key={item.label} type="button" className={className} onClick={() => setLimit(`${item.label} não faz parte desta entrega.`)}>
              <img src={item.icon} alt="" width={18} height={18} />
              {item.label}
            </button>
          )
        }
        return (
          <Link key={item.label} to={item.to} className={className}>
            <img src={item.icon} alt="" width={18} height={18} />
            {item.label}
          </Link>
        )
      })}
      <p className="px-4 text-caption text-text-muted" role="status">{limit}</p>
      <button
        type="button"
        onClick={() => {
          void signOut(queryClient).then(() => navigate({ to: '/' }))
        }}
        className="btn btn-quiet mt-2 flex h-10 items-center gap-3 border-t border-primary px-4 font-bold text-text-accent"
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-text-accent">
          <img src={logoutIcon} alt="" width={14} height={14} />
        </span>
        Sair
      </button>
    </nav>
  )
  return (
    <div className="container-kurio grid gap-[28px] py-8 lg:grid-cols-[310px_1fr]">
      <aside className="hidden rounded-lg bg-surface-card py-2 lg:block">
        <h1 className="px-2.5 py-2.5 text-[18px] leading-4 font-bold">Meu perfil</h1>
        {nav}
      </aside>
      <details open className="rounded-lg bg-surface-card p-4 lg:hidden">
        <summary className="cursor-pointer font-bold">Meu perfil</summary>
        {nav}
      </details>
      <div>{children}</div>
    </div>
  )
}

export function ProfilePage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: fetchProfile, meta: { scope: 'private' } })
  const [saved, setSaved] = useState('')
  return (
    <AccountFrame>
      <h2 className="text-body-lg leading-4 font-bold">Perfil do colecionador</h2>
      <form
        className="mt-8 grid max-w-3xl gap-6 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const name = String(data.get('display') ?? '')
          const email = String(data.get('email') ?? '')
          const currentPassword = String(data.get('current') ?? '')
          const nextPassword = String(data.get('next') ?? '')
          const confirmPassword = String(data.get('confirm') ?? '')
          if (name.length < 2 || !email.includes('@')) {
            setSaved('Revise nome e e-mail.')
            return
          }
          if (nextPassword && nextPassword !== confirmPassword) {
            setSaved('A confirmação da senha não confere.')
            return
          }
          void (async () => {
            try {
              await updateProfile({
                name,
                email,
                bio: profile.data?.bio ?? '',
                avatarUrl: profile.data?.avatarUrl ?? null,
              })
              if (currentPassword && nextPassword) await changePassword({ currentPassword, nextPassword })
              setSaved('Perfil atualizado.')
            } catch (error) {
              setSaved(error instanceof ApiError ? error.message : 'Não foi possível salvar o perfil.')
            }
          })()
        }}
      >
        <Field label="Nome de exibição" required labelClassName="text-[15px] leading-[15px]">
          <input name="display" key={profile.data?.name} defaultValue={profile.data?.name ?? ''} className={fieldClass} />
        </Field>
        <Field label="Nome de usuário" required labelClassName="text-[15px] leading-[15px]">
          <input name="username" className={fieldClass} />
        </Field>
        <Field label="E-mail" required labelClassName="text-[15px] leading-[15px]">
          <input name="email" type="email" key={profile.data?.email} defaultValue={profile.data?.email ?? ''} className={fieldClass} />
        </Field>
        <Field label="Nome ENS" required labelClassName="text-[15px] leading-[15px]">
          <span className="flex gap-2.5">
            <span className="relative">
              <select
                className={cn(fieldClass, 'w-[78px] appearance-none pr-7 pl-3')}
                aria-label="Sufixo ENS"
                defaultValue=".eth"
              >
                <option>.eth</option>
              </select>
              <SelectArrow />
            </span>
            <input name="ens" className={cn(fieldClass, 'flex-1')} />
          </span>
        </Field>
        <Field label="Apelido da carteira" required labelClassName="text-[15px] leading-[15px]">
          <input name="alias" className={fieldClass} />
        </Field>
        <div>
          <p className="text-[15px] leading-[15px] text-text-primary">Avatar</p>
          <div className="mt-2.5 flex items-center gap-5">
            <span className="grid size-[50px] place-items-center rounded-full border border-border bg-surface-raised">
              <img src={imageIcon} alt="" width={24} height={24} />
            </span>
            <button type="button" className="h-10 w-[98px] rounded-[3px] bg-primary text-body font-bold text-ink">
              Alterar
            </button>
            <button type="button" className="btn btn-quiet text-body text-text-primary">
              Remover
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <h3 className="text-body-lg leading-4 font-medium">Alterar senha</h3>
          <div className="mt-6 grid max-w-md gap-6">
            <Field label="Senha atual" labelClassName="text-[15px] leading-[15px]">
              <PasswordInput name="current" autoComplete="current-password" className={fieldClass} />
            </Field>
            <Field label="Nova senha" labelClassName="text-[15px] leading-[15px]">
              <PasswordInput name="next" autoComplete="new-password" className={fieldClass} />
            </Field>
            <Field label="Confirmar nova senha" labelClassName="text-[15px] leading-[15px]">
              <PasswordInput name="confirm" autoComplete="new-password" className={fieldClass} />
            </Field>
          </div>
        </div>
        <button type="submit" className="btn btn-fill h-10 w-[131px] rounded-[3px] bg-primary font-bold text-ink">
          Salvar
        </button>
        <p className="self-center text-caption text-text-muted" role="status">
          {saved}
        </p>
      </form>
    </AccountFrame>
  )
}

export function WalletsPage() {
  const [saved, setSaved] = useState('')
  const [same, setSame] = useState(false)
  return (
    <AccountFrame>
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] leading-4 font-bold">Carteira principal</h2>
        <button type="button" className="btn btn-quiet text-body-lg font-medium text-text-accent">
          Adicionar
        </button>
      </div>
      <p className="mt-1 text-body text-text-secondary">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>
      <form
        className="mt-6 grid max-w-3xl gap-6 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const address = String(data.get('address') ?? '')
          const alias = String(data.get('alias') ?? 'Principal')
          const networkName = String(data.get('network') ?? '')
          const network = networkName === 'Polygon' ? 'polygon' : networkName === 'Base' ? 'base' : 'ethereum'
          if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            setSaved('Informe um endereço 0x com 40 caracteres hexadecimais.')
            return
          }
          void (async () => {
            try {
              const current = await fetchWallets()
              const primary = current.find((item) => item.isPrimary)
              if (primary) await updateWallet(primary.id, { label: alias || primary.label, address, network, isPrimary: true })
              else await createWallet({ label: alias || 'Principal', address, network, isPrimary: true })
              setSaved('Carteira principal atualizada.')
            } catch (error) {
              setSaved(error instanceof ApiError ? error.message : 'Não foi possível salvar a carteira.')
            }
          })()
        }}
      >
        <Field label="Nome de exibição" required labelClassName="text-[15px] leading-[15px]">
          <input name="display" className={fieldClass} />
        </Field>
        <Field label="Apelido da carteira" required labelClassName="text-[15px] leading-[15px]">
          <input name="alias" className={fieldClass} />
        </Field>
        <Field label="Rede" required labelClassName="text-[15px] leading-[15px]">
          <span className="relative">
            <select
              name="network"
              className={cn(fieldClass, 'appearance-none pr-10')}
              defaultValue=""
            >
              <option value="">Selecione uma rede</option>
              <option>Ethereum</option>
              <option>Polygon</option>
              <option>Solana</option>
            </select>
            <SelectArrow />
          </span>
        </Field>
        <Field label="Nome do perfil" required labelClassName="text-[15px] leading-[15px]">
          <input name="profile" className={fieldClass} />
        </Field>
        <Field label="Endereço da carteira" required labelClassName="text-[15px] leading-[15px]">
          <input name="address" className={fieldClass} placeholder="Endereço 0x da carteira" />
        </Field>
        <Field label="ENS ou carteira secundária (opcional)" labelClassName="text-[15px] leading-[15px]">
          <input className={fieldClass} placeholder="ENS ou carteira secundária (opcional)" />
        </Field>
        <Field label="Tipo de carteira" required labelClassName="text-[15px] leading-[15px]">
          <span className="relative">
            <select
              name="type"
              className={cn(fieldClass, 'appearance-none pr-10')}
              defaultValue=""
            >
              <option value="">Selecione uma carteira</option>
              <option>MetaMask</option>
              <option>WalletConnect</option>
              <option>Coinbase Wallet</option>
            </select>
            <SelectArrow />
          </span>
        </Field>
        <Field label="Código de indicação" required labelClassName="text-[15px] leading-[15px]">
          <input name="referral" className={fieldClass} />
        </Field>
        <Field label="E-mail" required labelClassName="text-[15px] leading-[15px]">
          <input type="email" name="email" className={fieldClass} />
        </Field>
        <Field label="Nome ENS" required labelClassName="text-[15px] leading-[15px]">
          <span className="flex gap-2.5">
            <span className="relative">
              <select
                className={cn(fieldClass, 'w-[78px] appearance-none pr-7 pl-3')}
                aria-label="Sufixo ENS"
                defaultValue=".eth"
              >
                <option>.eth</option>
              </select>
              <SelectArrow />
            </span>
            <input name="ens" className={cn(fieldClass, 'flex-1')} />
          </span>
        </Field>
        <button type="submit" className="btn btn-fill h-10 w-fit min-w-[131px] rounded-[3px] bg-primary px-6 font-bold text-ink whitespace-nowrap">
          Salvar carteira
        </button>
        <p className="self-center text-caption text-text-muted" role="status">
          {saved}
        </p>
      </form>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-[17px] leading-4 font-bold">Carteira secundária</h2>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-body text-text-primary">
            <input type="radio" checked={same} onChange={() => setSame(true)} className="accent-primary" /> Igual à carteira
            principal
          </label>
          <button type="button" className="btn btn-quiet text-body-lg font-medium text-text-accent">
            Adicionar
          </button>
        </div>
      </div>
      <p className="mt-2 text-body text-text-secondary">
        {same ? 'A carteira secundária usa os mesmos dados da principal.' : 'Você ainda não adicionou uma carteira secundária.'}
      </p>
    </AccountFrame>
  )
}
