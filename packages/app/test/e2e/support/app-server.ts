import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

/** The production build (`pnpm build`); integration tests run what we ship. */
export const SERVER_ENTRY = fileURLToPath(new URL('../../../.output/server/index.mjs', import.meta.url))

const READY_TIMEOUT_MS = 30_000
const READY_POLL_MS = 200

export interface AppServer {
  url: string
  /** Everything the server printed, for failure diagnostics. */
  output(): string
  stop(): Promise<void>
}

async function freePort(): Promise<number> {
  const server = createServer().listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address() as { port: number }
  server.close()
  return port
}

/** Starts the built app on a free port and waits until it answers HTTP (any health status). */
export async function startAppServer({ databaseUrl }: { databaseUrl: string }): Promise<AppServer> {
  if (!existsSync(SERVER_ENTRY)) {
    throw new Error(
      `No production build at ${SERVER_ENTRY}. Run \`pnpm build\` (or \`pnpm test:integration\`).`,
    )
  }
  const port = await freePort()
  const url = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => (output += chunk))
  child.stderr.on('data', (chunk) => (output += chunk))
  const exited = once(child, 'exit')

  const stop = async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM')
      await exited
    }
  }

  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`App server exited with ${child.exitCode}:\n${output}`)
    try {
      await fetch(`${url}/api/v1/health`)
      return { url, output: () => output, stop }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS))
    }
  }
  await stop()
  throw new Error(`App server did not start within ${READY_TIMEOUT_MS} ms:\n${output}`)
}
