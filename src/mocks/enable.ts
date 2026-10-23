export async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW === 'false') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api')) print.warning()
    },
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  document.documentElement.dataset.msw = 'ready'
}
