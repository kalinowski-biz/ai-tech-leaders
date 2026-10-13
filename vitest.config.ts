import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'core', environment: 'node', include: ['packages/core/src/**/*.test.ts'] } },
      {
        test: {
          name: 'database',
          environment: 'node',
          include: ['packages/database/{src,test}/**/*.test.ts'],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: 'app',
          environment: 'node',
          include: ['packages/app/{app,server,shared}/**/*.test.ts'],
        },
      },
    ],
  },
})
