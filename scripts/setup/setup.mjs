/**
 * The steps of README "Quick start". Every step is safe to repeat: it either
 * detects that its work is done and is skipped, or delegates to a command that
 * is itself idempotent (`pnpm install`, `db:migration:up`).
 */

const MIN_NODE_MAJOR = 22
const SKIPPED = Symbol('skipped')

/** A problem the user has to fix; reported as a message, not a stack trace. */
export class SetupError extends Error {}

/** `DATABASE_URL` from a dotenv text, or undefined when it is not set. */
export function databaseUrl(dotenv) {
  const match = /^DATABASE_URL=(.*)$/m.exec(dotenv)
  return match ? match[1].trim() : undefined
}

/** Runs every step; returns the process exit code. */
export function runSetup(sys) {
  try {
    sys.log('TripSalesAgent setup')
    const pnpm = findPnpm(sys)
    step(sys, 'Install dependencies', () => pnpm('install'))
    step(sys, 'Create .env from .env.example', () =>
      sys.exists('.env') ? skip('.env already exists') : sys.copy('.env.example', '.env'),
    )
    step(sys, 'Start the local PostgreSQL', () => startDatabase(sys, pnpm))
    step(sys, 'Apply pending migrations', () => pnpm('db:migration:up'))
    sys.log('\nDone. Start the app with `pnpm dev` → http://localhost:3000')
    return 0
  } catch (error) {
    if (!(error instanceof SetupError)) throw error
    sys.log(`\n✗ ${error.message}`)
    return 1
  }
}

function step(sys, title, action) {
  sys.log(`\n→ ${title}`)
  const result = action()
  sys.log(result?.[SKIPPED] ? `↷ ${title}: skipped – ${result[SKIPPED]}` : `✓ ${title}`)
}

function skip(reason) {
  return { [SKIPPED]: reason }
}

/** Checks the prerequisites and returns a runner for pnpm commands. */
function findPnpm(sys) {
  const major = Number(sys.nodeVersion.split('.')[0])
  if (major < MIN_NODE_MAJOR) {
    throw new SetupError(`Node.js >= ${MIN_NODE_MAJOR} is required, found ${sys.nodeVersion}.`)
  }
  // Without pnpm on PATH, corepack (bundled with Node) runs the version pinned in `packageManager`.
  const prefix = sys.capture('pnpm', ['--version'])
    ? ['pnpm']
    : sys.capture('corepack', ['--version'])
      ? ['corepack', 'pnpm']
      : undefined
  if (!prefix)
    throw new SetupError('pnpm was not found. Run `corepack enable` (or install pnpm 11) and re-run.')
  return (...args) => {
    const [command, ...rest] = [...prefix, ...args]
    if (!sys.run(command, rest))
      throw new SetupError(`\`${prefix.join(' ')} ${args.join(' ')}\` failed – see the output above.`)
  }
}

/** docker-compose PostgreSQL, unless `.env` points DATABASE_URL at another database. */
function startDatabase(sys, pnpm) {
  const url = databaseUrl(sys.read('.env'))
  if (url !== undefined && url !== databaseUrl(sys.read('.env.example'))) {
    return skip('DATABASE_URL in .env points at your own PostgreSQL')
  }
  if (sys.capture('docker', ['compose', 'version']) === undefined) {
    throw new SetupError(
      'Docker with the Compose plugin is required for the local database. Install it, or set DATABASE_URL in .env to your own PostgreSQL, and re-run.',
    )
  }
  const running = sys.capture('docker', ['compose', 'ps', '--status', 'running', '--services'])
  if (running === undefined)
    throw new SetupError('Docker is not running. Start the Docker daemon and re-run.')
  if (running.split('\n').includes('db')) return skip('the db container is already running')
  // `--wait` blocks until the healthcheck passes, so migrations never race the container start.
  pnpm('db:up', '--wait')
}
