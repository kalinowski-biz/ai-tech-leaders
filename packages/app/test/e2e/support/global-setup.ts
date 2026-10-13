import type { TestProject } from 'vitest/node'
import { startTestDatabase } from '../../../../database/test/support/postgres.ts'
import { startAppServer } from './app-server.ts'

declare module 'vitest' {
  export interface ProvidedContext {
    /** Base URL of the built app, running against the test database. */
    baseUrl: string
  }
}

/** Ephemeral PostgreSQL (Testcontainers) + the production build of the app, shared by all browser tests. */
export default async function setup(project: TestProject) {
  const database = await startTestDatabase()
  const server = await startAppServer({ databaseUrl: database.url }).catch(async (error: unknown) => {
    await database.stop()
    throw error
  })
  project.provide('baseUrl', server.url)
  return async () => {
    await server.stop()
    await database.stop()
  }
}
