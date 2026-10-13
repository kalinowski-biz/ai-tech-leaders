import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, inject, type TestContext } from 'vitest'
import { Browser } from './browser.ts'

/** Screenshots of failed tests; uploaded as a CI artifact. */
const RESULTS_DIR = fileURLToPath(new URL('../../../../../test-results/e2e/', import.meta.url))

/**
 * One browser session per test file, pointed at the app started by the global
 * setup. A failing test leaves a screenshot in `test-results/e2e/`.
 */
export function useBrowser(): Browser {
  const browser = new Browser(inject('baseUrl'))

  beforeAll(async () => {
    await mkdir(RESULTS_DIR, { recursive: true })
  })

  afterEach(async ({ task }: TestContext) => {
    if (task.result?.state !== 'fail') return
    const name = task.fullName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    await browser.screenshot(`${RESULTS_DIR}${name}.png`).catch(() => undefined)
  })

  afterAll(() => browser.close())

  return browser
}
