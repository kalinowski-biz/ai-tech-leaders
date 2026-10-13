import { createError, defineEventHandler, isError, type EventHandlerRequest, type H3Event } from 'h3'
import { isDomainError, type DomainErrorKind } from '@tripsalesagent/core'
import type { ApiErrorBody } from '#shared/types/api'

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  VALIDATION: 422,
  UNAVAILABLE: 503,
}

/**
 * Wraps every `/api/v1` handler: domain errors become the documented status
 * and `{ code, message, fields? }` body; anything unexpected is logged and
 * returned as a generic 500 without internals. Handlers never `try/catch`.
 */
export function defineApiHandler<T>(handler: (event: H3Event<EventHandlerRequest>) => T | Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      throw toHttpError(event, error)
    }
  })
}

export function toHttpError(event: H3Event, error: unknown) {
  if (isError(error)) return error
  if (isDomainError(error)) {
    const data: ApiErrorBody = { code: error.code, message: error.message }
    if ('fields' in error && Array.isArray(error.fields)) data.fields = error.fields
    return createError({ statusCode: STATUS_BY_KIND[error.kind], statusMessage: error.code, data })
  }
  console.error('[api] unexpected error', { method: event.method, path: event.path, error })
  const data: ApiErrorBody = { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' }
  return createError({ statusCode: 500, statusMessage: data.code, data })
}
