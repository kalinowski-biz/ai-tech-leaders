import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from './app.vue'

describe('app shell', () => {
  it('renders the page inside its layout, plus the toaster and the confirm dialog host', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    expect(wrapper.get('header').text()).toContain('TripSalesAgent')
    expect(wrapper.get('h1').text()).toBe('Sell more trips, with less effort.')
    expect(wrapper.find('section[aria-label^="Notifications"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'AppConfirmDialog' }).exists()).toBe(true)
  })
})
