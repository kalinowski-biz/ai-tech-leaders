import { describe, expect, it } from 'vitest'
import { ForbiddenError, UnauthorizedError, type Actor } from '@tripsalesagent/core'
import { fakeEvent } from '../../test/helpers/h3-event'
import { requireActor, requireRole } from './actor'

const agent: Actor = { userId: 'u-1', role: 'AGENT', agentId: 'a-1' }

function eventWith(actor?: Actor) {
  const event = fakeEvent()
  event.context.actor = actor
  return event
}

describe('requireActor', () => {
  it('returns the authenticated actor', () => {
    expect(requireActor(eventWith(agent))).toBe(agent)
  })

  it('fails closed with 401 when nobody is logged in', () => {
    expect(() => requireActor(eventWith())).toThrow(UnauthorizedError)
  })
})

describe('requireRole', () => {
  it('lets an actor with one of the roles through', () => {
    expect(requireRole(eventWith(agent), 'OFFICE', 'AGENT')).toBe(agent)
  })

  it('rejects other roles with 403', () => {
    expect(() => requireRole(eventWith(agent), 'OFFICE')).toThrow(ForbiddenError)
  })

  it('checks authentication before the role', () => {
    expect(() => requireRole(eventWith(), 'OFFICE')).toThrow(UnauthorizedError)
  })
})
