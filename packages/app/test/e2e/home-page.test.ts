import { describe, expect, it } from 'vitest'
import { useBrowser } from './support/fixtures.ts'

describe('home page', () => {
  const browser = useBrowser()

  it('renders the public landing page', async () => {
    await browser.open('/')
    expect(await browser.text('h1')).toBe('Sell more trips, with less effort.')
    expect(await browser.text('header')).toContain('TripSalesAgent')
    expect(await browser.text('main')).toContain('TripSalesAgent helps travel sales teams')
    expect(await browser.pageErrors()).toEqual([])
  })

  it('navigates to the admin panel from the call to action', async () => {
    await browser.open('/')
    await browser.clickRole('link', 'Open the admin')
    await browser.waitForUrl('**/admin')
    await browser.waitForText('Dashboard')
    expect(await browser.path()).toBe('/admin')
    expect(await browser.text('h1')).toBe('Dashboard')
  })

  it('navigates to the admin panel from the header link', async () => {
    await browser.open('/')
    await browser.click('header a[href="/admin"]')
    await browser.waitForUrl('**/admin')
    expect(await browser.text('h1')).toBe('Dashboard')
  })

  it('answers unknown pages with the Nuxt 404 page', async () => {
    await browser.open('/does-not-exist')
    await browser.waitForText('404')
  })
})
