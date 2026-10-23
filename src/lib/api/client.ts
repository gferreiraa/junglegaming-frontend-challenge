import axios from 'axios'
import { apiErrorBodySchema } from '@/contracts'
import { ApiError } from '@/lib/api/errors'
import { clearToken, readGuestId, readToken } from '@/lib/api/storage'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
})

api.interceptors.request.use((config) => {
  const token = readToken()
  config.headers.set('X-Guest-Id', readGuestId())
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error instanceof Error ? error : new ApiError(0, 'unknown', 'Falha inesperada'))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError(0, 'timeout', 'A resposta demorou demais'))
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return Promise.reject(new ApiError(0, 'offline', 'Sem conexão com o marketplace'))
    }

    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    const body = parsed.success
      ? parsed.data.error
      : { code: 'http_error', message: 'A operação não pôde ser concluída', fields: undefined }

    const url = error.config?.url ?? ''
    const isSessionProbe = url.includes('/auth/session') || url.includes('/auth/login') || url.includes('/auth/register')
    if (error.response.status === 401 && !isSessionProbe) {
      clearToken()
      window.dispatchEvent(new CustomEvent('marketplace:unauthorized'))
    }

    return Promise.reject(new ApiError(error.response.status, body.code, body.message, body.fields))
  },
)
