import { defineConfig } from '@mikro-orm/postgresql'
import { Migrator } from '@mikro-orm/migrations'
import { entities } from './entities/index.ts'

/** Environment variables read by this package: DATABASE_URL, DATABASE_POOL_MIN/MAX, DATABASE_DEBUG. */
export type DatabaseEnv = Record<string, string | undefined>

/** Builds the MikroORM config from environment variables. */
export function createOrmConfig(env: DatabaseEnv = process.env) {
  const clientUrl = env.DATABASE_URL
  if (!clientUrl) {
    throw new Error('DATABASE_URL is not set (see .env.example)')
  }

  return defineConfig({
    clientUrl,
    entities,
    extensions: [Migrator],
    pool: {
      min: Number(env.DATABASE_POOL_MIN ?? 2),
      max: Number(env.DATABASE_POOL_MAX ?? 10),
    },
    debug: env.DATABASE_DEBUG === 'true',
    discovery: { warnWhenNoEntities: false },
    migrations: {
      path: new URL('../migrations', import.meta.url).pathname,
      glob: '!(*.d).{js,ts}',
      transactional: true,
      emit: 'ts',
    },
  })
}
