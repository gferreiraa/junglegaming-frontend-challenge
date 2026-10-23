import { useQuery } from '@tanstack/react-query'
import { ScanLine } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/session'
import { fetchCart } from '@/lib/api/marketplace'
import homeIcon from '../../../design/icons/Home.svg?url'
import heartIcon from '../../../design/icons/heart 1.svg?url'
import cartIcon from '../../../design/icons/Cart Icon.svg?url'
import userIcon from '../../../design/icons/User.svg?url'

const notchMask = 'radial-gradient(circle 28px at 50% 0%, transparent 28px, black 29px)'

export function BottomTabBar() {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const session = useQuery(sessionQueryOptions)
  const cart = useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => fetchCart(signal) })
  const count = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const visible = path === '/' || path.startsWith('/perfil')
  if (!visible) return null
  const active = path === '/'
  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-4 bottom-4 z-30 grid h-[72px] grid-cols-5 items-center px-3 lg:hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 rounded-full bg-surface-card"
        style={{ maskImage: notchMask, WebkitMaskImage: notchMask }}
      />
      <Link to="/" className="btn btn-quiet relative grid place-items-center" aria-label="Início">
        <img src={homeIcon} alt="" className={`size-5 ${active ? '' : 'opacity-50'}`} />
      </Link>
      <Link to="/" hash="mercado" className="btn btn-quiet grid place-items-center" aria-label="Favoritos">
        <img src={heartIcon} alt="" className="size-5" />
      </Link>
      <span className="grid place-items-center">
        <span
          className="relative grid size-14 -translate-y-6 place-items-center rounded-full bg-primary text-text-primary shadow-fab"
          aria-hidden="true"
        >
          <ScanLine className="size-6" />
        </span>
      </span>
      <Link to="/carrinho" className="btn btn-quiet relative grid place-items-center" aria-label={`Carrinho, ${count} itens`}>
        <img src={cartIcon} alt="" className="size-5" />
        {count > 0 ? (
          <span className="absolute -top-2 -right-2 grid size-[18px] place-items-center rounded-full bg-primary text-micro font-bold text-ink">
            {count}
          </span>
        ) : null}
      </Link>
      {session.data ? (
        <Link to="/perfil" className="btn btn-quiet grid place-items-center" aria-label="Perfil">
          <img src={userIcon} alt="" className="size-5" />
        </Link>
      ) : (
        <Link to="/entrar" className="btn btn-quiet grid place-items-center text-caption font-bold" aria-label="Entrar">
          Entrar
        </Link>
      )}
    </nav>
  )
}
