import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '../../utils/api-error'
import ErrorBanner from './ErrorBanner.vue'

describe('AppErrorBanner', () => {
  it('shows the Polish message, the code and a retry action', async () => {
    const wrapper = await mountSuspended(ErrorBanner, {
      props: { error: new ApiError(503, 'DATABASE_UNAVAILABLE', 'Down.') },
    })
    expect(wrapper.get('[role="alert"]').text()).toContain('Baza danych jest niedostępna.')
    expect(wrapper.text()).toContain('Kod: DATABASE_UNAVAILABLE')
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').text()).toBe('Spróbuj ponownie')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('offers loading the current version on a version conflict', async () => {
    const wrapper = await mountSuspended(ErrorBanner, {
      props: { error: new ApiError(409, 'VERSION_CONFLICT', 'Changed.') },
    })
    expect(wrapper.get('button').text()).toBe('Wczytaj aktualną wersję')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('reload')).toHaveLength(1)
    expect(wrapper.emitted('retry')).toBeUndefined()
  })

  it('has no action when the failure is not retryable', async () => {
    const wrapper = await mountSuspended(ErrorBanner, {
      props: { error: new ApiError(403, 'FORBIDDEN', 'No.'), retryable: false },
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
