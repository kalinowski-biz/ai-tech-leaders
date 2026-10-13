import { createError, getRequestHeader, setResponseHeader, type H3Event } from 'h3'
import type { ApiErrorBody } from '#shared/types/api'

/**
 * Optimistic locking over HTTP: reads of versioned resources send
 * `ETag: "<version>"`, mutations must send it back in `If-Match`; the service
 * compares it with the stored version and throws `VersionConflictError` (409).
 */
export function setVersionTag(event: H3Event, version: number): void {
  setResponseHeader(event, 'ETag', `"${version}"`)
}

/** The version from `If-Match`; a missing or malformed header is 428 Precondition Required. */
export function requireIfMatch(event: H3Event): number {
  const match = /^"(\d+)"$/.exec(getRequestHeader(event, 'if-match')?.trim() ?? '')
  if (!match) {
    const data: ApiErrorBody = {
      code: 'PRECONDITION_REQUIRED',
      message: 'Send the If-Match header with the last read version.',
    }
    throw createError({ statusCode: 428, statusMessage: data.code, data })
  }
  return Number(match[1])
}
