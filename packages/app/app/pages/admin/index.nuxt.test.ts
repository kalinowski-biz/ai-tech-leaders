import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import AdminPage from './index.vue'

const { definePageMeta } = vi.hoisted(() => ({ definePageMeta: vi.fn() }))
mockNuxtImport('definePageMeta', () => definePageMeta)

const HEALTHY = { status: 'ok', database: 'up', time: '2026-10-13T08:00:00.000Z' }
const DOWN = createError({ statusCode: 503, data: { code: 'DATABASE_UNAVAILABLE', message: 'Down.' } })

const unregister: (() => void)[] = []
const mounted: { unmount(): void }[] = []

function health(...responses: (() => unknown)[]) {
  let call = 0
  unregister.push(
    registerEndpoint('/api/v1/health', () => responses[Math.min(call++, responses.length - 1)]!()),
  )
}

async function mountPage() {
  const wrapper = await mountSuspended(AdminPage)
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

const refreshButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.findAll('button').find((button) => button.text().startsWith('Refresh'))!

describe('admin dashboard', () => {
  afterEach(() => {
    // The page must be gone before its cached `health` data is cleared, or the next mount reuses it.
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
    unregister.splice(0).forEach((off) => off())
    clearNuxtData('health')
  })

  it('uses the admin layout', async () => {
    health(() => HEALTHY)
    await mountPage()
    expect(definePageMeta).toHaveBeenCalledWith({ layout: 'admin' })
  })

  it('shows the health of the system', async () => {
    health(() => HEALTHY)
    const wrapper = await mountPage()
    expect(wrapper.get('h1').text()).toBe('Dashboard')
    expect(wrapper.get('[data-slot="badge"]').text()).toBe('ok')
    expect(wrapper.text()).toContain('database: up')
  })

  it('shows the error with a retry that reloads the health', async () => {
    const down = () => {
      throw DOWN
    }
    // $fetch retries a failed GET once on 503, so the first load makes two calls.
    health(down, down, () => HEALTHY)
    const wrapper = await mountPage()
    await vi.waitFor(() =>
      expect(wrapper.get('[role="alert"]').text()).toContain('Baza danych jest niedostępna.'),
    )

    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(false))
    expect(wrapper.text()).toContain('database: up')
  })

  it('shows only the refresh action for an empty response', async () => {
    health(() => null)
    const wrapper = await mountPage()
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(refreshButton(wrapper).text()).toBe('Refresh')
  })

  it('shows a skeleton and a disabled refresh while loading', async () => {
    let respond!: (value: unknown) => void
    health(
      () => HEALTHY,
      () => new Promise((resolve) => (respond = resolve)),
    )
    const wrapper = await mountPage()

    await refreshButton(wrapper).trigger('click')
    await vi.waitFor(() => expect(refreshButton(wrapper).text()).toBe('Refreshing…'))
    expect(refreshButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false)
    await vi.waitFor(() => expect(wrapper.find('[role="status"]').exists()).toBe(true))

    respond(HEALTHY)
    await vi.waitFor(() => expect(refreshButton(wrapper).text()).toBe('Refresh'))
    expect(wrapper.get('[data-slot="badge"]').text()).toBe('ok')
  })
})
