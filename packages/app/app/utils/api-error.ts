import type { ApiErrorBody, ApiFieldError } from '#shared/types/api'

/**
 * Normalized failure of an `/api/v1` call; `status` 0 means the server was not
 * reached. `statusCode` and `data` mirror h3's error shape so the error
 * survives `useAsyncData` wrapping and SSR payload serialization.
 */
export class ApiError extends Error {
  readonly data: ApiErrorBody

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: ApiFieldError[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.data = { code, message, ...(fields.length > 0 && { fields }) }
  }

  get statusCode(): number {
    return this.status
  }

  get isVersionConflict(): boolean {
    return this.status === 409 && this.code === 'VERSION_CONFLICT'
  }
}

interface FetchErrorLike {
  name?: string
  statusCode?: number
  status?: number
  data?: unknown
  cause?: unknown
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}

/**
 * Accepts whatever `$fetch` / `useAsyncData` throws (FetchError, NuxtError
 * wrapping it, network failure) and returns an `ApiError`.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const candidate = (error ?? {}) as FetchErrorLike
  if (candidate.cause instanceof ApiError) return candidate.cause
  const status = candidate.statusCode ?? candidate.status ?? 0
  // h3 serializes `createError({ data })` as `{ statusCode, message, data }`.
  const payload = (candidate.data as { data?: unknown } | undefined)?.data ?? candidate.data
  if (isApiErrorBody(payload)) return new ApiError(status, payload.code, payload.message, payload.fields)
  if (status > 0) return new ApiError(status, 'UNKNOWN_ERROR', `Request failed with status ${status}.`)
  if (candidate.name === 'FetchError')
    return new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached.')
  // Not a failed request but a bug in the calling code – surface it instead of disguising it as a network error.
  console.error('[api] unexpected client error', error)
  return new ApiError(0, 'CLIENT_ERROR', 'Unexpected client error.')
}
