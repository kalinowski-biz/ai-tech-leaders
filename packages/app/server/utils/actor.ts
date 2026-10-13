import type { H3Event } from 'h3'
import { ForbiddenError, UnauthorizedError, type Actor, type Role } from '@tripsalesagent/core'

/**
 * The authenticated actor of the request. `event.context.actor` is set by the
 * session middleware (added with the auth concept); until then every protected
 * endpoint answers 401 – access checks fail closed.
 */
export function requireActor(event: H3Event): Actor {
  const actor = event.context.actor
  if (!actor) throw new UnauthorizedError()
  return actor
}

/** Role gate for an endpoint. Ownership of the specific record is checked in the service. */
export function requireRole(event: H3Event, ...roles: Role[]): Actor {
  const actor = requireActor(event)
  if (!roles.includes(actor.role)) throw new ForbiddenError()
  return actor
}
