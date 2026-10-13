import type { Actor } from '@tripsalesagent/core'
import type { AppContainer } from './utils/container'

declare module 'h3' {
  interface H3EventContext {
    /** Request-scoped Awilix container, see `useScope()`. */
    scope?: AppContainer
    /** Authenticated actor, set by the session middleware; read it with `requireActor()`. */
    actor?: Actor
  }
}
