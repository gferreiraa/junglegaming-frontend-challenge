import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status)) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})

export function clearPrivateQueries() {
  queryClient.removeQueries({
    predicate: (query) => query.meta?.scope === 'private',
  })
  queryClient.setQueryData(['checkout-ack'], { dirty: false })
}
