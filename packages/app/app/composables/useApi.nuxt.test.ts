import { afterEach, describe, expect, it } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, getRequestHeaders, readBody, setResponseHeader, type H3Event } from 'h3'
import { ApiError } from '../utils/api-error'
import { useApi } from './useApi'

interface Seen {
  method: string
  headers: Record<string, string | undefined>
  query: Record<string, unknown>
  body?: unknown
}

let seen: Seen | undefined
const unregister: (() => void)[] = []

function endpoint(path: string, respond: (event: H3Event) => unknown) {
  unregister.push(
    registerEndpoint(`/api/v1${path}`, async (event: H3Event) => {
      seen = {
        method: event.method,
        headers: getRequestHeaders(event),
        query: getQuery(event),
        body: event.method === 'GET' ? undefined : await readBody(event),
      }
      return respond(event)
    }),
  )
}

afterEach(() => {
  unregister.splice(0).forEach((off) => off())
  seen = undefined
})

describe('useApi().request', () => {
  it('calls /api/v1 with the CSRF header and returns the body', async () => {
    endpoint('/clients', () => [{ id: 'c-1' }])
    await expect(useApi().request('/clients', { query: { search: 'Kowalski' } })).resolves.toEqual([
      { id: 'c-1' },
    ])
    expect(seen).toMatchObject({ method: 'GET', query: { search: 'Kowalski' } })
    expect(seen?.headers['x-requested-with']).toBe('tripsalesagent')
    expect(seen?.headers['if-match']).toBeUndefined()
  })

  it('sends the body and the version as If-Match', async () => {
    endpoint('/clients/c-1', () => ({ ok: true }))
    await useApi().request('/clients/c-1', { method: 'PATCH', body: { name: 'Jan' }, version: 4 })
    expect(seen).toMatchObject({ method: 'PATCH', body: { name: 'Jan' } })
    expect(seen?.headers['if-match']).toBe('"4"')
  })

  it('omits If-Match for unversioned resources', async () => {
    endpoint('/clients', () => ({ ok: true }))
    await useApi().request('/clients', { method: 'POST', body: {}, version: null })
    expect(seen?.headers['if-match']).toBeUndefined()
  })

  it('turns an error response into an ApiError', async () => {
    endpoint('/clients/c-1', () => {
      throw createError({ statusCode: 409, data: { code: 'VERSION_CONFLICT', message: 'Changed.' } })
    })
    const error = await useApi()
      .request('/clients/c-1', { method: 'PATCH', body: {}, version: 1 })
      .catch((thrown: unknown) => thrown)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isVersionConflict).toBe(true)
  })
})

describe('useApi().requestVersioned', () => {
  it('returns the body with the version from the ETag', async () => {
    endpoint('/inquiries/i-1', (event) => {
      setResponseHeader(event, 'ETag', '"7"')
      return { id: 'i-1' }
    })
    await expect(useApi().requestVersioned('/inquiries/i-1')).resolves.toEqual({
      data: { id: 'i-1' },
      version: 7,
    })
  })

  it.each([
    ['no ETag', undefined],
    ['a weak ETag', 'W/"7"'],
    ['a non-numeric ETag', '"abc"'],
  ])('reports version null for %s', async (_case, etag) => {
    endpoint('/health', (event) => {
      if (etag) setResponseHeader(event, 'ETag', etag)
      return { status: 'ok' }
    })
    await expect(useApi().requestVersioned('/health')).resolves.toEqual({
      data: { status: 'ok' },
      version: null,
    })
  })

  it('turns an error response into an ApiError', async () => {
    endpoint('/inquiries/i-2', () => {
      throw createError({ statusCode: 404, data: { code: 'INQUIRY_NOT_FOUND', message: 'Not found.' } })
    })
    await expect(useApi().requestVersioned('/inquiries/i-2')).rejects.toMatchObject({
      status: 404,
      code: 'INQUIRY_NOT_FOUND',
    })
  })
})
