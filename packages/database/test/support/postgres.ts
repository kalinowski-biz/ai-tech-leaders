import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { createOrm } from '../../src/orm.ts'

/** Same image as `docker-compose.yml`, so tests run against the version used in development. */
export const POSTGRES_IMAGE = 'postgres:17-alpine'

export interface TestDatabase {
  /** Connection URL of a migrated, otherwise empty database. */
  url: string
  stop(): Promise<void>
}

/**
 * An ephemeral PostgreSQL for integration tests: a Testcontainers container,
 * or – on machines without Docker – the database at `TEST_DATABASE_URL`
 * (which must be disposable: migrations are applied to it).
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const externalUrl = process.env.TEST_DATABASE_URL
  const container = externalUrl ? undefined : await new PostgreSqlContainer(POSTGRES_IMAGE).start()
  const url = externalUrl ?? container!.getConnectionUri()
  await applyMigrations(url)
  return {
    url,
    async stop() {
      await container?.stop()
    },
  }
}

/** Runs every pending migration, exactly as `pnpm db:migration:up` does. */
export async function applyMigrations(url: string): Promise<void> {
  const orm = createOrm({ DATABASE_URL: url, DATABASE_POOL_MIN: '0', DATABASE_POOL_MAX: '2' })
  try {
    await orm.migrator.up()
  } finally {
    await orm.close()
  }
}
