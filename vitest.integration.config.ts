import { defineConfig } from 'vitest/config'

/**
 * Integration tests (`pnpm test:integration`): real PostgreSQL in Docker
 * (Testcontainers, or `TEST_DATABASE_URL`) and, for `e2e`, the production
 * build driven in a headless browser by agent-browser.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'database-integration',
          environment: 'node',
          include: ['packages/database/test/**/*.test.ts'],
          globalSetup: ['packages/database/test/support/global-setup.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['packages/app/test/e2e/**/*.test.ts'],
          globalSetup: ['packages/app/test/e2e/support/global-setup.ts'],
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
    // Pulling the PostgreSQL image on a cold runner can take a while.
    hookTimeout: 120_000,
  },
})
