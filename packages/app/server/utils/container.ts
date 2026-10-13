import { createContainer, InjectionMode, type AwilixContainer } from 'awilix'
import { registerCore, type CoreCradle } from '@tripsalesagent/core'
import { registerDatabase, type DatabaseCradle } from '@tripsalesagent/database'
import type { H3Event } from 'h3'

/**
 * Composition root. This is the ONLY place where the registrations of all
 * packages are assembled. Packages expose `register*(container)` functions and
 * never import the container from here.
 */
export type Cradle = CoreCradle & DatabaseCradle
export type AppContainer = AwilixContainer<Cradle>

let rootContainer: AppContainer | undefined

/** Root container (singletons: ORM, ...). Created lazily, disposed on Nitro shutdown. */
export function useRootContainer(): AppContainer {
  if (!rootContainer) {
    const container = createContainer<Cradle>({
      injectionMode: InjectionMode.PROXY,
      strict: true,
    })
    registerDatabase(container)
    registerCore(container)
    rootContainer = container
  }
  return rootContainer
}

export async function disposeRootContainer(): Promise<void> {
  const container = rootContainer
  rootContainer = undefined
  await container?.dispose()
}

/**
 * Request scope: one Awilix scope per request, created lazily on first use and
 * disposed when the response is closed. SCOPED registrations (e.g. the
 * `EntityManager` fork) live exactly as long as the request.
 */
export function useScope(event: H3Event): AppContainer {
  if (!event.context.scope) {
    const scope = useRootContainer().createScope<Cradle>()
    event.context.scope = scope
    event.node.res.once('close', () => {
      void scope.dispose()
    })
  }
  return event.context.scope
}
