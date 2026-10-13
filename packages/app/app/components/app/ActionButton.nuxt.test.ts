import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ActionButton from './ActionButton.vue'

describe('AppActionButton', () => {
  it('renders an enabled button with its label', async () => {
    const wrapper = await mountSuspended(ActionButton, { props: { label: 'Publikuj' } })
    const button = wrapper.get('button')
    expect(button.text()).toBe('Publikuj')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBe('false')
  })

  it('is disabled and shows the progressive label while pending', async () => {
    const wrapper = await mountSuspended(ActionButton, {
      props: { label: 'Publikuj', pendingLabel: 'Publikowanie…', pending: true, type: 'submit' },
    })
    const button = wrapper.get('button')
    expect(button.text()).toBe('Publikowanie…')
    expect(button.attributes('type')).toBe('submit')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
  })

  it('keeps the label while pending when there is no progressive label', async () => {
    const wrapper = await mountSuspended(ActionButton, { props: { label: 'Zapisz', pending: true } })
    expect(wrapper.get('button').text()).toBe('Zapisz')
  })

  it('passes variant and size to the button', async () => {
    const wrapper = await mountSuspended(ActionButton, {
      props: { label: 'Usuń', variant: 'destructive', size: 'sm' },
    })
    expect(wrapper.get('button').attributes('data-variant')).toBe('destructive')
    expect(wrapper.get('button').attributes('data-size')).toBe('sm')
  })
})
