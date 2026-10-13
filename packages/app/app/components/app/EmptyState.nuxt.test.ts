import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EmptyState from './EmptyState.vue'

describe('AppEmptyState', () => {
  it('says what will be here and offers the main action', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'Nie masz jeszcze klientów.', description: 'Dodaj pierwszego klienta.' },
      slots: { action: () => 'Dodaj klienta' },
    })
    expect(wrapper.text()).toContain('Nie masz jeszcze klientów.')
    expect(wrapper.text()).toContain('Dodaj pierwszego klienta.')
    expect(wrapper.text()).toContain('Dodaj klienta')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders without a description', async () => {
    const wrapper = await mountSuspended(EmptyState, { props: { title: 'Pusto.' } })
    expect(wrapper.findAll('p')).toHaveLength(1)
  })

  it('offers clearing the filters when filtered', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'Nie masz jeszcze klientów.', description: 'Opis.', filtered: true },
      slots: { action: () => 'Dodaj klienta' },
    })
    expect(wrapper.text()).toContain('Brak wyników dla wybranych filtrów.')
    expect(wrapper.text()).not.toContain('Opis.')
    expect(wrapper.text()).not.toContain('Dodaj klienta')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('clearFilters')).toHaveLength(1)
  })
})
