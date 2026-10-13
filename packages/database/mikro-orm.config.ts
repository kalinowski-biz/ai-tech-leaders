// Entry point for the MikroORM CLI (`pnpm db:migration:*`).
import { createOrmConfig } from './src/config.ts'

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url))
} catch {
  // no .env file – rely on the real environment
}

export default createOrmConfig()
