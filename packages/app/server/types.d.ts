import type { AppContainer } from './utils/container'

declare module 'h3' {
  interface H3EventContext {
    /** Request-scoped Awilix container, see `useScope()`. */
    scope?: AppContainer
  }
}
