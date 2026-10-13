import { afterEach, describe, expect, it, vi } from 'vitest'
import { UnavailableError } from '@tripsalesagent/core'
import { fakeEvent } from '../../../test/helpers/h3-event'
import { defineApiHandler } from '../../utils/api-handler'

/** Nitro auto-imports, provided as globals the way the Nitro bundle does. */
async function loadHandler(check: () => Promise<unknown>) {
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('useScope', () => ({ cradle: { healthService: { check } } }))
  vi.resetModules()
  return (await import('./health.get')).default
}

describe('GET /api/v1/health', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the report of the request-scoped HealthService', async () => {
    const report = { status: 'ok', database: 'up', time: '2026-10-13T08:00:00.000Z' }
    const handler = await loadHandler(async () => report)
    await expect(handler(fakeEvent())).resolves.toEqual(report)
  })

  it('answers 503 DATABASE_UNAVAILABLE when the database is down', async () => {
    const handler = await loadHandler(() =>
      Promise.reject(new UnavailableError('DATABASE_UNAVAILABLE', 'The database is unreachable.')),
    )
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'DATABASE_UNAVAILABLE' },
    })
  })
})
