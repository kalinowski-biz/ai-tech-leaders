import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startAppServer, type AppServer } from './support/app-server.ts'
import { Browser } from './support/browser.ts'
import { useBrowser } from './support/fixtures.ts'

describe('admin panel', () => {
  const browser = useBrowser()

  it('shows a healthy system: the request-scoped container reached the test database', async () => {
    await browser.open('/admin')
    expect(await browser.text('h1')).toBe('Dashboard')
    expect(await browser.text('[data-slot="badge"]')).toBe('ok')
    expect(await browser.text('[data-slot="card-content"]')).toContain('database: up')
    expect(await browser.count('[role="alert"]')).toBe(0)
    expect(await browser.pageErrors()).toEqual([])
  })

  it('refreshes the health check on demand', async () => {
    await browser.open('/admin')
    await browser.clickRole('button', 'Refresh')
    await browser.waitForText('database: up')
    expect(await browser.text('[data-slot="badge"]')).toBe('ok')
  })

  it('links back to the public site', async () => {
    await browser.open('/admin')
    await browser.clickRole('link', 'View site')
    await browser.waitForUrl('**/')
    expect(await browser.text('h1')).toBe('Sell more trips, with less effort.')
  })
})

describe('admin panel without a database', () => {
  let server: AppServer
  let browser: Browser

  beforeAll(async () => {
    // Nothing listens on port 1: the app must boot and report the outage instead of crashing.
    server = await startAppServer({ databaseUrl: 'postgresql://user:secret@127.0.0.1:1/none' })
    browser = new Browser(server.url)
  })

  afterAll(async () => {
    await browser?.close()
    await server?.stop()
  })

  it('shows the Polish outage message with the error code and a retry', async () => {
    await browser.open('/admin')
    await browser.waitForSelector('[role="alert"]')
    const alert = await browser.text('[role="alert"]')
    expect(alert).toContain('Baza danych jest niedostępna. Spróbuj ponownie za chwilę.')
    expect(alert).toContain('Kod: DATABASE_UNAVAILABLE')
    await browser.clickRole('button', 'Spróbuj ponownie')
    await browser.waitForSelector('[role="alert"]')
  })
})
