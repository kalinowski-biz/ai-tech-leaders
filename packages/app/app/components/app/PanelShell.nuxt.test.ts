import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PanelShell, { type PanelNavItem } from './PanelShell.vue'

const items: PanelNavItem[] = [
  { label: 'Panel', to: '/agent/panel' },
  { label: 'Oferty', to: '/agent/oferty' },
]

describe('AppPanelShell', () => {
  it('renders the side rail with the menu, the user slot, logout and the page', async () => {
    const wrapper = await mountSuspended(PanelShell, {
      props: { title: 'Menu biura', items },
      slots: { default: () => 'Treść strony', user: () => 'Anna Biuro' },
    })
    const rail = wrapper.get('nav[aria-label="Menu biura"]')
    expect(rail.findAll('li a').map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Panel', '/agent/panel'],
      ['Oferty', '/agent/oferty'],
    ])
    expect(rail.classes()).toContain('flex')
    expect(rail.text()).toContain('Anna Biuro')
    expect(rail.get('a[href="/logowanie"]').text()).toBe('Wyloguj')
    expect(wrapper.get('main').text()).toBe('Treść strony')
    expect(wrapper.get('main').classes()).not.toContain('pb-24')
    expect(wrapper.find('nav[aria-label="Menu biura (telefon)"]').exists()).toBe(false)
  })

  it('turns the menu into a bottom tab bar on phones with mobileTabs', async () => {
    const wrapper = await mountSuspended(PanelShell, {
      props: { title: 'Menu agenta', items, mobileTabs: true },
    })
    expect(wrapper.get('nav[aria-label="Menu agenta"]').classes()).toContain('hidden')
    expect(wrapper.get('main').classes()).toContain('pb-24')
    const tabs = wrapper.get('nav[aria-label="Menu agenta (telefon)"]')
    expect(tabs.get('ul').attributes('style')).toContain('repeat(2, minmax(0, 1fr))')
    expect(tabs.findAll('a').map((link) => link.text())).toEqual(['Panel', 'Oferty'])
  })
})
