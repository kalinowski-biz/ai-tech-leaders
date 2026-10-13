import { asFunction, Lifetime, type AwilixContainer } from 'awilix'
import type { EntityManager } from '@mikro-orm/postgresql'
import { createOrm, type Orm } from './orm.ts'
import type { DatabaseEnv } from './config.ts'

/** Cradle entries contributed by this package. */
export interface DatabaseCradle {
  orm: Orm
  /** Request-scoped fork of the entity manager (own identity map per scope). */
  em: EntityManager
  /** Implements the `HealthProbe` port of `@tripsalesagent/core`. */
  healthProbe: { ping(): Promise<void> }
}

/** Registers the ORM (singleton, closed on container dispose) and a scoped `em` fork. */
export function registerDatabase(container: AwilixContainer, env?: DatabaseEnv): void {
  container.register({
    orm: asFunction(() => createOrm(env), { lifetime: Lifetime.SINGLETON }).disposer((o) => o.close()),
    em: asFunction(({ orm }: DatabaseCradle) => orm.em.fork(), { lifetime: Lifetime.SCOPED }),
    healthProbe: asFunction(
      ({ em }: DatabaseCradle) => ({
        async ping() {
          await em.getConnection().execute('select 1')
        },
      }),
      { lifetime: Lifetime.SCOPED },
    ),
  })
}
