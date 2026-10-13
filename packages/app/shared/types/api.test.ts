import { describe, expect, it } from 'vitest'
import { API_CLIENT_HEADER, API_CLIENT_HEADER_VALUE } from './api'

describe('API client header', () => {
  it('is a custom header a cross-site form cannot send', () => {
    expect(API_CLIENT_HEADER).toBe('x-requested-with')
    expect(API_CLIENT_HEADER_VALUE).toBe('tripsalesagent')
  })
})
