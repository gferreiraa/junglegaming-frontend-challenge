import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthPanel } from '@/features/kurio/auth-dialog'

export const Route = createFileRoute('/cadastro')({
  head: () => ({ meta: [{ title: 'Criar conta — KURIO' }] }),
  component: function SignupScreen() {
    const navigate = useNavigate()
    return (
      <div className="mx-auto grid min-h-[70svh] w-full max-w-md place-items-center px-6 py-10">
        <div className="w-full">
          <p className="text-center text-h2 font-bold tracking-[0.18em]">KURIO</p>
          <h1 className="mt-8 text-center text-body-lg font-bold">Criar perfil de colecionador</h1>
          <div className="mt-6">
            <AuthPanel initial="signup" onDone={() => void navigate({ to: '/' })} />
          </div>
        </div>
      </div>
    )
  },
})
