import { describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminLayout from './admin.vue'
import AgentLayout from './agent.vue'
import DefaultLayout from './default.vue'
import OfficeLayout from './office.vue'

const slots = { default: () => 'Treść strony' }

const menu = (wrapper: VueWrapper, label: string) =>
  wrapper
    .get(`nav[aria-label="${label}"]`)
    .findAll('li a')
    .map((link) => link.attributes('href'))

describe('layouts', () => {
  it('default: public header with the brand and the admin link', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { slots })
    expect(wrapper.get('header').text()).toContain('TripSalesAgent')
    expect(wrapper.get('header a[href="/admin"]').text()).toBe('Admin')
    expect(wrapper.get('main').text()).toBe('Treść strony')
  })

  it('admin: header linking back to the site', async () => {
    const wrapper = await mountSuspended(AdminLayout, { slots })
    expect(wrapper.get('header a[href="/admin"]').text()).toBe('TripSalesAgent · Admin')
    expect(wrapper.get('header a[href="/"]').text()).toBe('View site')
    expect(wrapper.get('main').text()).toBe('Treść strony')
  })

  it('agent: agent zone menu (01 §3.1) with phone tabs', async () => {
    const wrapper = await mountSuspended(AgentLayout, { slots })
    expect(menu(wrapper, 'Menu agenta')).toEqual([
      '/agent/panel',
      '/agent/oferty',
      '/agent/zapytania',
      '/agent/klienci',
      '/agent/prowizje',
    ])
    expect(wrapper.find('nav[aria-label="Menu agenta (telefon)"]').exists()).toBe(true)
    expect(wrapper.get('main').text()).toBe('Treść strony')
  })

  it('office: office zone menu (01 §3.2), desktop only', async () => {
    const wrapper = await mountSuspended(OfficeLayout, { slots })
    expect(menu(wrapper, 'Menu biura')).toEqual([
      '/biuro/kolejka',
      '/biuro/do-rozliczenia',
      '/biuro/oferty',
      '/biuro/agenci',
      '/biuro/prowizje',
      '/biuro/raport',
    ])
    expect(wrapper.find('nav[aria-label="Menu biura (telefon)"]').exists()).toBe(false)
    expect(wrapper.get('main').text()).toBe('Treść strony')
  })
})
