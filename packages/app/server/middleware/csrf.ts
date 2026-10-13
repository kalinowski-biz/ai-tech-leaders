import { createError, defineEventHandler, getRequestHeader, getRequestHost, type H3Event } from 'h3'
import { API_CLIENT_HEADER, API_CLIENT_HEADER_VALUE, type ApiErrorBody } from '#shared/types/api'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF defense for the cookie session (on top of `sameSite=lax`): every
 * state-changing `/api/v1` request must carry the custom header that only
 * `useApi()` sets, and, when the browser sends `Origin`, come from this host.
 */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/v1/') || SAFE_METHODS.has(event.method)) return
  if (!isSameOriginApiCall(event)) {
    const data: ApiErrorBody = { code: 'CSRF_REJECTED', message: 'Request rejected.' }
    throw createError({ statusCode: 403, statusMessage: data.code, data })
  }
})

function isSameOriginApiCall(event: H3Event): boolean {
  if (getRequestHeader(event, API_CLIENT_HEADER) !== API_CLIENT_HEADER_VALUE) return false
  const origin = getRequestHeader(event, 'origin')
  if (!origin) return true
  try {
    return new URL(origin).host === getRequestHost(event, { xForwardedHost: true })
  } catch {
    return false
  }
}
