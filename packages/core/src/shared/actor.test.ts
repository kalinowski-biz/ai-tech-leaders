import { describe, expect, it } from 'vitest'
import { ROLES } from './actor.ts'

describe('ROLES', () => {
  it('has exactly the two MVP roles: agent and office', () => {
    expect(ROLES).toEqual(['AGENT', 'OFFICE'])
  })
})
