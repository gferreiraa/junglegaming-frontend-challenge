import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useLayoutEffect, useRef, useState } from 'react'
import searchIcon from '../../../design/icons/Search Icon.svg?url'
import cartIcon from '../../../design/icons/Cart Icon.svg?url'
import loginIcon from '../../../design/icons/Logout.svg?url'
import { sessionQueryOptions, signOut } from '@/features/auth/session'
import { fetchCart } from '@/lib/api/marketplace'

type NavId = 'inicio' | 'mercado' | 'criadores' | 'aprenda'

const links: { id: NavId; label: string; to?: '/'; hash?: string }[] = [
  { id: 'inicio', label: 'Início', to: '/' },
  { id: 'mercado', label: 'Mercado', to: '/', hash: 'mercado' },
  { id: 'criadores', label: 'Criadores' },
  { id: 'aprenda', label: 'Aprenda' },
]

function activeNav(pathname: string, hash: string): NavId | null {
  const normalized = hash.replace(/^#/, '')
  if (pathname === '/' && normalized === 'mercado') return 'mercado'
  if (pathname === '/') return 'inicio'
  if (pathname === '/perfil' || pathname === '/perfil/carteiras') return 'inicio'
  if (pathname === '/carrinho' || pathname === '/pagamento' || pathname.startsWith('/nft')) return 'mercado'
  return null
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hash = useRouterState({ select: (state) => state.location.hash })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions)
  const cart = useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => fetchCart(signal) })
  const count = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const [notice, setNotice] = useState('')
  const headerRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [animate, setAnimate] = useState(false)
  const current = activeNav(pathname, hash)

  useLayoutEffect(() => {
    const header = headerRef.current
    const active = header?.querySelector<HTMLElement>('[data-active="true"]')
    if (!header || !active) {
      setIndicator({ left: 0, width: 0 })
      return
    }
    const headerBox = header.getBoundingClientRect()
    const activeBox = active.getBoundingClientRect()
    setIndicator({ left: activeBox.left - headerBox.left, width: activeBox.width })
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [current])

  useLayoutEffect(() => {
    const measure = () => {
      const header = headerRef.current
      const active = header?.querySelector<HTMLElement>('[data-active="true"]')
      if (!header || !active) return
      const headerBox = header.getBoundingClientRect()
      const activeBox = active.getBoundingClientRect()
      setIndicator({ left: activeBox.left - headerBox.left, width: activeBox.width })
    }
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [current])

  return (
    <header ref={headerRef} className="relative hidden border-b border-border lg:block">
      <div className="container-kurio flex h-16 items-center gap-6">
        <Link to="/" className="text-body-lg font-bold tracking-[0.18em]">
          KURIO
        </Link>
        <nav aria-label="Principal" className="mx-auto hidden items-center gap-8 lg:flex">
          {links.map((link) => {
            const active = link.id === current
            const className = `btn btn-quiet text-body-lg font-bold ${active ? 'text-text-accent' : 'text-text-primary'}`
            if (!link.to) {
              return (
                <button
                  key={link.id}
                  type="button"
                  className={className}
                  onClick={() => setNotice(`${link.label} não tem página neste marketplace.`)}
                >
                  {link.label}
                </button>
              )
            }
            return (
              <Link
                key={link.id}
                to={link.to}
                hash={link.hash}
                data-active={active ? 'true' : undefined}
                aria-current={active ? 'page' : undefined}
                className={className}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/" hash="mercado" className="btn btn-icon grid size-10 place-items-center rounded-full" aria-label="Buscar">
            <img src={searchIcon} alt="" width={20} height={20} />
          </Link>
          <Link to="/carrinho" className="btn btn-icon relative grid size-10 place-items-center rounded-full" aria-label={count === 1 ? 'Carrinho, 1 item' : `Carrinho, ${count} itens`}>
            <img src={cartIcon} alt="" width={24} height={24} />
            {count > 0 ? (
              <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-micro font-bold text-ink">
                {count}
              </span>
            ) : null}
          </Link>
          {session.data ? (
            <span className="hidden items-center gap-2 lg:inline-flex">
              <Link to="/perfil" className="btn btn-fill inline-flex h-10 items-center rounded-sm bg-primary px-4 text-body-lg font-bold text-ink">
                {session.data.user.name}
              </Link>
              <button
                type="button"
                className="btn btn-quiet h-10 px-2 text-body font-bold text-text-accent"
                onClick={() => void signOut(queryClient)}
              >
                Sair
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-fill inline-flex h-10 items-center gap-2 rounded-sm bg-primary px-4 text-body-lg font-bold text-ink"
              onClick={() => void navigate({ to: '/', search: { auth: 'login' } })}
            >
              <img src={loginIcon} alt="" width={18} height={18} />
              Entrar
            </button>
          )}
        </div>
      </div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 h-0.5 bg-primary ${animate ? 'transition-[left,width] duration-300 ease-out' : ''}`}
        style={{ left: indicator.left, width: indicator.width, transform: 'translateY(1px)' }}
      />
      <p className="sr-only" role="status">{notice}</p>
    </header>
  )
}
