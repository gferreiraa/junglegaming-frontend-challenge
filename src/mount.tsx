import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from '@/lib/query/client'
import { router } from '@/router'

export function mount() {
  const root = document.getElementById('root')
  if (!root) return
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )

  if (import.meta.env.DEV) {
    void import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => {
      const holder = document.createElement('div')
      document.body.append(holder)
      createRoot(holder).render(<ReactQueryDevtools initialIsOpen={false} />)
    })
    void import('@tanstack/react-router-devtools').then(({ TanStackRouterDevtools }) => {
      const holder = document.createElement('div')
      document.body.append(holder)
      createRoot(holder).render(<TanStackRouterDevtools router={router} />)
    })
  }
}
