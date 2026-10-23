import { createRootRouteWithContext, HeadContent } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <HeadContent />
      <AppShell />
    </>
  ),
  notFoundComponent: () => (
    <main className="mx-auto grid max-w-xl gap-3 px-4 py-16">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <a href="/" className="text-primary">
        Ir para o início
      </a>
    </main>
  ),
})
