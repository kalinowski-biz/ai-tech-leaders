import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** The pinned CLI from the root devDependencies (never a global install). */
const AGENT_BROWSER = fileURLToPath(
  new URL('../../../../../node_modules/.bin/agent-browser', import.meta.url),
)

/** Waits for page state; generous for cold CI runners. */
export const BROWSER_TIMEOUT_MS = 15_000

interface CliResult<T> {
  success: boolean
  data: T | null
  error: string | null
}

export class BrowserCommandError extends Error {
  constructor(args: string[], detail: string) {
    super(`agent-browser ${args.join(' ')} failed: ${detail}`)
    this.name = 'BrowserCommandError'
  }
}

export interface PageError {
  text: string
}

/**
 * Typed wrapper around the agent-browser CLI (https://github.com/vercel-labs/agent-browser)
 * for integration tests. Every instance drives its own named, headless browser
 * session, so test files can run in parallel and never touch a developer's
 * shared default session. Selectors are CSS (or `@eN` refs from `snapshot`).
 */
export class Browser {
  readonly session = `tsa-e2e-${randomUUID().slice(0, 8)}`

  constructor(readonly baseUrl: string) {}

  /** Runs any agent-browser command in this session and returns its `data`. */
  async command<T = Record<string, unknown>>(...args: string[]): Promise<T> {
    const argv = ['--session', this.session, '--json', ...args]
    let stdout: string
    try {
      ;({ stdout } = await run(AGENT_BROWSER, argv, { timeout: BROWSER_TIMEOUT_MS * 2 }))
    } catch (error) {
      // A failed command exits non-zero but still prints its JSON result.
      stdout = (error as { stdout?: string }).stdout ?? ''
      if (!stdout) throw new BrowserCommandError(args, String(error))
    }
    const result = JSON.parse(stdout) as CliResult<T>
    if (!result.success || result.data === null)
      throw new BrowserCommandError(args, result.error ?? 'no data')
    return result.data
  }

  /** Opens a path of the app (or an absolute URL) and waits for the network to settle. */
  async open(path = '/'): Promise<void> {
    await this.command('open', new URL(path, this.baseUrl).toString())
    await this.command('wait', '--load', 'networkidle')
  }

  async text(selector: string): Promise<string> {
    return (await this.command<{ text: string }>('get', 'text', selector)).text.trim()
  }

  async attribute(selector: string, name: string): Promise<string | null> {
    return (await this.command<{ value: string | null }>('get', 'attr', selector, name)).value
  }

  async count(selector: string): Promise<number> {
    return (await this.command<{ count: number }>('get', 'count', selector)).count
  }

  /** Current path + query, e.g. `/admin`. */
  async path(): Promise<string> {
    const { url } = await this.command<{ url: string }>('get', 'url')
    const { pathname, search } = new URL(url)
    return `${pathname}${search}`
  }

  async title(): Promise<string> {
    return (await this.command<{ title: string }>('get', 'title')).title
  }

  async click(selector: string): Promise<void> {
    await this.command('click', selector)
  }

  /** Clicks the element with this ARIA role and accessible name (exact). */
  async clickRole(role: string, name: string): Promise<void> {
    await this.command('find', 'role', role, 'click', '--name', name, '--exact')
  }

  async waitForText(text: string): Promise<void> {
    await this.command('wait', '--text', text, '--timeout', String(BROWSER_TIMEOUT_MS))
  }

  async waitForSelector(selector: string): Promise<void> {
    await this.command('wait', selector, '--timeout', String(BROWSER_TIMEOUT_MS))
  }

  /** Waits for a URL glob, e.g. `**\/admin`. */
  async waitForUrl(pattern: string): Promise<void> {
    await this.command('wait', '--url', pattern, '--timeout', String(BROWSER_TIMEOUT_MS))
  }

  /** Uncaught page errors (incl. hydration failures that throw) since the session started. */
  async pageErrors(): Promise<PageError[]> {
    return (await this.command<{ errors: PageError[] }>('errors')).errors
  }

  /** Accessibility tree of the page – handy in a failing test's output. */
  async snapshot(): Promise<string> {
    return (await this.command<{ snapshot: string }>('snapshot')).snapshot
  }

  async screenshot(path: string): Promise<void> {
    await this.command('screenshot', path)
  }

  async close(): Promise<void> {
    await this.command('close').catch(() => undefined)
  }
}
