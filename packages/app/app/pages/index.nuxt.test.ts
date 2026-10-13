import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HomePage from './index.vue'

describe('home page', () => {
  it('pitches the product and links to the admin', async () => {
    const wrapper = await mountSuspended(HomePage)
    expect(wrapper.get('h1').text()).toBe('Sell more trips, with less effort.')
    expect(wrapper.get('a[href="/admin"]').text()).toBe('Open the admin')
  })
})
