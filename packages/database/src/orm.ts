import { MikroORM } from '@mikro-orm/postgresql'
import { createOrmConfig, type DatabaseEnv } from './config.ts'

export type Orm = MikroORM

/**
 * Creates the ORM instance. Synchronous on purpose: no connection is opened
 * until the first query, so the app boots (and reports `degraded` health)
 * even when PostgreSQL is down. Use `await orm.connect()` to fail fast.
 */
export function createOrm(env?: DatabaseEnv): Orm {
  return new MikroORM(createOrmConfig(env))
}
