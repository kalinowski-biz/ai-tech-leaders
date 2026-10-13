import { describe, expect, it } from 'vitest'
import { HealthService } from './health.ts'
import { FixedClock } from './shared/clock.ts'
import { UnavailableError } from './shared/errors.ts'

describe('HealthService', () => {
  const clock = new FixedClock('2026-10-13T08:00:00Z')

  it('reports ok with the clock time when the probe answers', async () => {
    const service = new HealthService({ healthProbe: { ping: async () => {} }, clock })
    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
      time: '2026-10-13T08:00:00.000Z',
    })
  })

  it('throws UnavailableError when the probe fails', async () => {
    const failing = { ping: () => Promise.reject(new Error('ECONNREFUSED')) }
    const service = new HealthService({ healthProbe: failing, clock })
    await expect(service.check()).rejects.toBeInstanceOf(UnavailableError)
  })
})
