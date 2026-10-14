import { describe, expect, it } from 'vitest'
import { databaseUrl, runSetup } from './setup.mjs'

const EXAMPLE =
  'DATABASE_URL=postgresql://tripsalesagent:tripsalesagent@localhost:5432/tripsalesagent\nDATABASE_DEBUG=false\n'

interface FakeOptions {
  nodeVersion?: string
  files?: Record<string, string>
  /** stdout per `command args`; a missing key means the command fails. */
  outputs?: Record<string, string>
  /** `command args` lines that fail when run. */
  failing?: string[]
}

/** In-memory stand-in for `createSystem()`; records commands, copies and output. */
function fakeSystem({ nodeVersion = '24.1.0', files = {}, outputs = {}, failing = [] }: FakeOptions = {}) {
  const fs: Record<string, string> = { '.env.example': EXAMPLE, ...files }
  const ran: string[] = []
  const lines: string[] = []
  const sys = {
    nodeVersion,
    run: (command: string, args: string[]) => {
      const line = [command, ...args].join(' ')
      ran.push(line)
      return !failing.includes(line)
    },
    capture: (command: string, args: string[]) => outputs[[command, ...args].join(' ')],
    exists: (file: string) => file in fs,
    read: (file: string) => {
      if (!(file in fs)) throw new Error(`ENOENT: ${file}`)
      return fs[file]
    },
    copy: (from: string, to: string) => {
      fs[to] = fs[from]!
    },
    log: (line: string) => lines.push(line),
  }
  return { sys, fs, ran, output: () => lines.join('\n') }
}

const TOOLS = {
  'pnpm --version': '11.25.0\n',
  'docker compose version': 'Docker Compose version v2.40.0\n',
  'docker compose ps --status running --services': '',
}

describe('runSetup', () => {
  it('sets up a fresh clone: install, .env, database, migrations', () => {
    const { sys, fs, ran, output } = fakeSystem({ outputs: TOOLS })

    expect(runSetup(sys)).toBe(0)
    expect(ran).toEqual(['pnpm install', 'pnpm db:up --wait', 'pnpm db:migration:up'])
    expect(fs['.env']).toBe(EXAMPLE)
    expect(output()).toContain('✓ Create .env from .env.example')
    expect(output()).toContain('✓ Start the local PostgreSQL')
    expect(output()).toContain('`pnpm dev`')
  })

  it('skips the steps already done on a re-run and never overwrites .env', () => {
    const env = `${EXAMPLE}DATABASE_POOL_MAX=4\n`
    const { sys, fs, ran, output } = fakeSystem({
      files: { '.env': env },
      outputs: { ...TOOLS, 'docker compose ps --status running --services': 'db\n' },
    })

    expect(runSetup(sys)).toBe(0)
    expect(fs['.env']).toBe(env)
    expect(ran).toEqual(['pnpm install', 'pnpm db:migration:up'])
    expect(output()).toContain('↷ Create .env from .env.example: skipped – .env already exists')
    expect(output()).toContain('↷ Start the local PostgreSQL: skipped – the db container is already running')
  })

  it('skips docker-compose when .env points DATABASE_URL at another database', () => {
    const { sys, ran, output } = fakeSystem({
      files: { '.env': 'DATABASE_URL=postgresql://me:pw@db.internal:5432/app\n' },
      outputs: { 'pnpm --version': '11.25.0\n' },
    })

    expect(runSetup(sys)).toBe(0)
    expect(ran).toEqual(['pnpm install', 'pnpm db:migration:up'])
    expect(output()).toContain('skipped – DATABASE_URL in .env points at your own PostgreSQL')
  })

  it('uses docker-compose when .env has no DATABASE_URL', () => {
    const { sys, ran } = fakeSystem({ files: { '.env': 'DATABASE_DEBUG=true\n' }, outputs: TOOLS })

    expect(runSetup(sys)).toBe(0)
    expect(ran).toContain('pnpm db:up --wait')
  })

  it('falls back to corepack when pnpm is not on PATH', () => {
    const { 'pnpm --version': _, ...withoutPnpm } = TOOLS
    const { sys, ran } = fakeSystem({ outputs: { ...withoutPnpm, 'corepack --version': '0.34.0\n' } })

    expect(runSetup(sys)).toBe(0)
    expect(ran[0]).toBe('corepack pnpm install')
  })

  it.each([
    [
      'Node.js is too old',
      { nodeVersion: '20.11.1', outputs: TOOLS },
      'Node.js >= 22 is required, found 20.11.1.',
    ],
    ['neither pnpm nor corepack exists', { outputs: {} }, 'pnpm was not found. Run `corepack enable`'],
    [
      'Docker Compose is missing',
      { outputs: { 'pnpm --version': '11.25.0\n' } },
      'Docker with the Compose plugin is required',
    ],
    [
      'the Docker daemon is down',
      { outputs: { 'pnpm --version': '11.25.0\n', 'docker compose version': 'v2\n' } },
      'Docker is not running.',
    ],
    [
      'a command fails',
      { outputs: TOOLS, failing: ['pnpm install'] },
      '`pnpm install` failed – see the output above.',
    ],
  ] satisfies [string, FakeOptions, string][])(
    'stops with exit code 1 and a message when %s',
    (_, options, message) => {
      const { sys, output } = fakeSystem(options)

      expect(runSetup(sys)).toBe(1)
      expect(output()).toContain(`✗ ${message}`)
    },
  )

  it('stops before migrating when the database does not start', () => {
    const { sys, ran } = fakeSystem({ outputs: TOOLS, failing: ['pnpm db:up --wait'] })

    expect(runSetup(sys)).toBe(1)
    expect(ran).not.toContain('pnpm db:migration:up')
  })

  it('rethrows unexpected errors instead of reporting them as setup problems', () => {
    const { sys } = fakeSystem({ outputs: TOOLS })
    sys.copy = () => {
      throw new Error('EACCES')
    }

    expect(() => runSetup(sys)).toThrow('EACCES')
  })
})

describe('databaseUrl', () => {
  it('reads DATABASE_URL from a dotenv text', () => {
    expect(databaseUrl('A=1\nDATABASE_URL=postgresql://x/y \n')).toBe('postgresql://x/y')
    expect(databaseUrl('# DATABASE_URL=postgresql://x/y\n')).toBeUndefined()
  })
})
