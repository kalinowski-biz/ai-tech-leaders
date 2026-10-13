import type { TestProject } from 'vitest/node'
import { startTestDatabase } from './postgres.ts'

declare module 'vitest' {
  export interface ProvidedContext {
    /** URL of the migrated test database (see `startTestDatabase`). */
    databaseUrl: string
  }
}

/** One PostgreSQL per test run for the `database` integration tests. */
export default async function setup(project: TestProject) {
  const database = await startTestDatabase()
  project.provide('databaseUrl', database.url)
  return () => database.stop()
}
