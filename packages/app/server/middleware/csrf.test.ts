import { describe, expect, it } from 'vitest'
import { API_CLIENT_HEADER, API_CLIENT_HEADER_VALUE } from '#shared/types/api'
import { fakeEvent, type FakeRequest } from '../../test/helpers/h3-event'
import csrf from './csrf'

const CLIENT_HEADER = { [API_CLIENT_HEADER]: API_CLIENT_HEADER_VALUE }

function run(request: FakeRequest) {
  return () => csrf(fakeEvent(request))
}

const rejected = expect.objectContaining({
  statusCode: 403,
  data: { code: 'CSRF_REJECTED', message: 'Request rejected.' },
})

describe('CSRF middleware', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('lets safe %s requests through without the header', (method) => {
    expect(run({ method, url: '/api/v1/clients' })).not.toThrow()
  })

  it('ignores requests outside /api/v1', () => {
    expect(run({ method: 'POST', url: '/logowanie' })).not.toThrow()
  })

  it('accepts a mutation from useApi() without an Origin (same-origin fetch, server-side call)', () => {
    expect(run({ method: 'POST', url: '/api/v1/clients', headers: CLIENT_HEADER })).not.toThrow()
  })

  it('accepts a mutation whose Origin matches the host', () => {
    const headers = { ...CLIENT_HEADER, origin: 'https://app.example' }
    expect(run({ method: 'PATCH', url: '/api/v1/clients/1', headers })).not.toThrow()
  })

  it('honours X-Forwarded-Host behind the proxy', () => {
    const headers = {
      ...CLIENT_HEADER,
      origin: 'https://portal.example',
      'x-forwarded-host': 'portal.example',
    }
    expect(run({ method: 'POST', url: '/api/v1/clients', headers })).not.toThrow()
  })

  it('rejects a mutation without the client header', () => {
    expect(run({ method: 'POST', url: '/api/v1/clients' })).toThrow(rejected)
  })

  it('rejects a mutation with a wrong client header value', () => {
    expect(
      run({ method: 'DELETE', url: '/api/v1/clients/1', headers: { [API_CLIENT_HEADER]: 'XMLHttpRequest' } }),
    ).toThrow(rejected)
  })

  it('rejects a cross-origin mutation', () => {
    const headers = { ...CLIENT_HEADER, origin: 'https://evil.example' }
    expect(run({ method: 'POST', url: '/api/v1/clients', headers })).toThrow(rejected)
  })

  it('rejects a malformed Origin', () => {
    const headers = { ...CLIENT_HEADER, origin: 'null' }
    expect(run({ method: 'POST', url: '/api/v1/clients', headers })).toThrow(rejected)
  })
})
