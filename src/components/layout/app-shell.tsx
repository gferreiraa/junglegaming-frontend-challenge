import { Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { BottomTabBar } from '@/components/layout/bottom-tab-bar'
import { ScenarioPanel } from '@/components/layout/scenario-panel'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { RealtimeBridge } from '@/features/realtime/bridge'
import { useQuery } from '@tanstack/react-query'
import { sessionQueryOptions } from '@/features/auth/session'

export function AppShell() {
  const session = useQuery(sessionQueryOptions)
  return (
    <div className="min-h-svh bg-ink font-mono text-text-primary">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-surface-card focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <RealtimeBridge token={session.data?.token ?? null} />
      <main id="conteudo">
        <Outlet />
      </main>
      <SiteFooter />
      <section aria-label="Cenários de demonstração" className="pb-28">
        <ScenarioPanel />
      </section>
      <BottomTabBar />
      <Toaster />
    </div>
  )
}
