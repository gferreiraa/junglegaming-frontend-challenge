import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { loginSearchSchema } from '@/contracts'
import { AuthPanel } from '@/features/kurio/auth-dialog'

function safeRedirect(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export const Route = createFileRoute('/entrar')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Entrar — KURIO' }] }),
  component: function LoginScreen() {
    const navigate = useNavigate()
    const { redirect: next } = Route.useSearch()
    return (
      <div className="mx-auto grid min-h-[70svh] w-full max-w-md place-items-center px-6 py-10">
        <div className="w-full">
          <p className="text-center text-h2 font-bold tracking-[0.18em]">KURIO</p>
          <h1 className="mt-8 text-center text-body-lg font-bold">Entrar</h1>
          <div className="mt-6">
            <AuthPanel initial="login" onDone={() => void navigate({ href: safeRedirect(next) })} />
          </div>
        </div>
      </div>
    )
  },
})
