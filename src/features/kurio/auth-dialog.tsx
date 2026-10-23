import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PasswordInput } from '@/components/kurio/bits'
import { cn } from '@/lib/utils'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { login, registerAccount } from '@/lib/api/marketplace'
import { writeToken } from '@/lib/api/storage'
import googleIcon from '../../../design/icons/google 1.svg?url'
import facebookIcon from '../../../design/icons/facebook 1.svg?url'

const fieldClass =
  'h-10 w-full rounded-[5px] border border-border bg-transparent px-4 text-input text-text-primary outline-none placeholder:text-text-muted'

export function AuthDialog({ auth }: { auth?: 'login' | 'signup' }) {
  const navigate = useNavigate()
  const open = auth === 'login' || auth === 'signup'
  const opener = useRef<HTMLElement | null>(null)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && void navigate({ to: '/', search: {} })}>
      <DialogContent
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return
          event.preventDefault()
          opener.current.focus()
        }}
        className={cn(
          'w-[500px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[8px] border-none bg-surface-card p-0 pb-[10px] text-text-primary shadow-modal',
          '[&>button]:top-[13px] [&>button]:right-[18px] [&>button]:rounded-none [&>button]:p-0 [&>button]:text-primary [&>button]:opacity-100',
        )}
      >
        <DialogTitle className="sr-only">Conta</DialogTitle>
        <AuthPanel initial={auth === 'signup' ? 'signup' : 'login'} onDone={() => void navigate({ to: '/' })} />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[10px] bg-primary" />
      </DialogContent>
    </Dialog>
  )
}

export function AuthPanel({
  initial,
  onDone,
}: {
  initial: 'login' | 'signup'
  onDone?: () => void
}) {
  const [mode, setMode] = useState(initial)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  async function submit(form: FormData) {
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? 'Colecionador')
    const confirm = String(form.get('confirm') ?? '')
    if (!email.includes('@') || password.length < 8) {
      setError('Use um e-mail válido e uma senha com 8 caracteres.')
      return
    }
    if (mode === 'signup' && password !== confirm) {
      setError('A confirmação da senha não confere.')
      return
    }
    try {
      const session =
        mode === 'signup'
          ? await registerAccount({ name: name || email.split('@')[0] || 'Colecionador', email, password })
          : await login(email, password)
      writeToken(session.token)
      queryClient.setQueryData(sessionQueryOptions.queryKey, session)
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      onDone?.()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível entrar.')
    }
  }

  return (
    <div className="pt-6 lg:pt-12">
      <h1 className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
      <div className="hidden px-5 lg:block lg:px-12">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={cn(
              'text-h3 leading-[16px] font-medium',
              mode === 'login' ? 'text-text-accent' : 'text-text-primary',
            )}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <span aria-hidden="true" className="h-5 w-px bg-text-coral" />
          <button
            type="button"
            className={cn(
              'text-h3 leading-[16px] font-medium',
              mode === 'signup' ? 'text-text-accent' : 'text-text-primary',
            )}
            onClick={() => setMode('signup')}
          >
            Criar conta
          </button>
        </div>
        <p className="mt-3 text-center text-[13px] leading-4 text-text-primary">
          {mode === 'login'
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </p>
      </div>
      <form
        className="mt-6 grid gap-3 px-5 lg:px-20"
        onSubmit={(event) => {
          event.preventDefault()
          submit(new FormData(event.currentTarget))
        }}
      >
        {mode === 'signup' ? (
          <>
            <label className="sr-only" htmlFor="auth-name">
              Nome de usuário
            </label>
            <input id="auth-name" name="name" className={fieldClass} placeholder="Nome de usuário" />
          </>
        ) : null}
        <label className="sr-only" htmlFor="auth-email">
          E-mail
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={fieldClass}
          placeholder={mode === 'login' ? 'contato@email.com' : 'Digite seu e-mail'}
        />
        <label className="sr-only" htmlFor="auth-password">
          Senha
        </label>
        <PasswordInput
          id="auth-password"
          name="password"
          placeholder="Senha"
          required
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className={cn(fieldClass, 'border-primary')}
        />
        {mode === 'signup' ? (
          <>
            <label className="sr-only" htmlFor="auth-confirm">
              Confirmar senha
            </label>
            <PasswordInput id="auth-confirm" name="confirm" placeholder="Confirmar senha" required autoComplete="new-password" className={fieldClass} />
          </>
        ) : (
          <p className="text-right text-body text-text-accent">Esqueceu a senha?</p>
        )}
        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-3">
          <button type="submit" className="h-[45px] w-full rounded-[5px] bg-primary text-body-lg font-bold text-ink">
            {mode === 'login' ? (
              'Entrar'
            ) : (
              <>
                <span className="hidden lg:inline">Criar conta</span>
                <span className="lg:hidden">Criar perfil</span>
              </>
            )}
          </button>
        </div>
      </form>
      <div className={cn('px-5 pb-6 lg:px-20', mode === 'login' ? 'mt-6' : 'mt-8')}>
        <div className={cn('flex items-center text-[13px] leading-4 text-text-primary', mode === 'login' ? 'gap-3' : 'gap-4')}>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          Ou continue com
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>
        <div className={cn('grid', mode === 'login' ? 'mt-3 gap-3' : 'mt-4 gap-4')}>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] font-medium text-text-secondary" onClick={() => setError('Continuar com Google não faz parte desta entrega.')}>
            <img src={googleIcon} alt="" width={20} height={20} />
            Continuar com Google
          </button>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] font-medium text-text-secondary" onClick={() => setError('Continuar com Facebook não faz parte desta entrega.')}>
            <img src={facebookIcon} alt="" width={20} height={20} />
            Continuar com Facebook
          </button>
        </div>
      </div>
      <p className="mt-4 pb-4 text-center text-caption lg:hidden">
        {mode === 'login' ? (
          <Link to="/cadastro" className="btn btn-quiet text-text-accent">Novo na Kurio? Crie uma conta</Link>
        ) : (
          <Link to="/entrar" className="btn btn-quiet text-text-accent">Já tem uma conta? Entre</Link>
        )}
      </p>
    </div>
  )
}
