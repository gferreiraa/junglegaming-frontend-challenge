import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { sessionSchema } from '@/contracts'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { logout } from '@/lib/api/marketplace'
import { clearToken, readToken } from '@/lib/api/storage'
import { clearPrivateQueries } from '@/lib/query/client'

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  meta: { scope: 'private' },
  queryFn: async ({ signal }) => {
    if (!readToken()) return null
    try {
      const { data } = await api.get('/auth/session', { signal })
      if (!readToken()) return null
      return sessionSchema.parse(data)
    } catch (error) {
      if (!readToken()) return null
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
})

export async function signOut(queryClient: QueryClient) {
  try {
    await logout()
  } catch {
    // Local sign-out still completes when the API already treats the session as invalid.
  }
  clearToken()
  clearPrivateQueries()
  queryClient.setQueryData(sessionQueryOptions.queryKey, null)
  await queryClient.invalidateQueries({ queryKey: ['cart'] })
}
