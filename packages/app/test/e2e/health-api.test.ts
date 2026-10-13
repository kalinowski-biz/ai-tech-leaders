import { describe, expect, inject, it } from 'vitest'

const baseUrl = inject('baseUrl')

describe('GET /api/v1/health', () => {
  it('reports the database as up', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`)
    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, string>
    expect(body).toMatchObject({ status: 'ok', database: 'up' })
    expect(new Date(body.time!).toISOString()).toBe(body.time)
  })
})

describe('CSRF protection', () => {
  it('rejects a state-changing API call without the client header', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, { method: 'POST' })
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ data: { code: 'CSRF_REJECTED' } })
  })
})
