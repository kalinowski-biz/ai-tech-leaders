import { describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { AsyncDataRequestStatus } from '#app'
import type { ColumnDef } from '@tanstack/vue-table'
import { ApiError } from '../../utils/api-error'
import DataTableComponent from './DataTable.vue'

/** `mountSuspended` cannot infer the props of a generic SFC; `Props` below types them. */
const DataTable = DataTableComponent as unknown as Component

interface Row {
  id: string
  name: string
  city: string
  unread: boolean
}

const rows: Row[] = [
  { id: '1', name: 'Kowalska', city: 'Gdańsk', unread: false },
  { id: '2', name: 'Adamczyk', city: 'Kraków', unread: true },
]

const columns: ColumnDef<Row, string>[] = [
  { accessorKey: 'name', header: 'Klient' },
  { header: 'Adres', columns: [{ accessorKey: 'city', header: 'Miasto', enableSorting: false }] },
]

interface Props {
  rows: Row[] | undefined
  status: AsyncDataRequestStatus
  error: ApiError | null
  filtered: boolean
  isHighlighted: (row: Row) => boolean
  onRowClick: (row: Row) => void
}

function mountTable(props: Partial<Props> = {}) {
  return mountSuspended(DataTable, {
    props: {
      columns,
      rows,
      status: 'success',
      error: null,
      emptyTitle: 'Nie masz jeszcze klientów.',
      ...props,
    },
  })
}

const names = (wrapper: VueWrapper) => wrapper.findAll('tbody tr').map((row) => row.find('td').text())

describe('AppDataTable', () => {
  it('renders the rows with grouped headers', async () => {
    const wrapper = await mountTable()
    expect(names(wrapper)).toEqual(['Kowalska', 'Adamczyk'])
    const headerRows = wrapper.findAll('thead tr')
    expect(headerRows).toHaveLength(2)
    expect(headerRows[0]!.text()).toBe('Adres')
    expect(headerRows[1]!.text()).toBe('KlientMiasto')
    expect(wrapper.find('[aria-hidden="true"].animate-pulse').exists()).toBe(false)
  })

  it('sorts by a sortable column, ascending then descending, and marks aria-sort', async () => {
    const wrapper = await mountTable()
    const header = () => wrapper.findAll('thead tr')[1]!.findAll('th')[0]!
    expect(header().attributes('aria-sort')).toBeUndefined()
    expect(wrapper.findAll('thead button')).toHaveLength(1)

    await header().find('button').trigger('click')
    expect(header().attributes('aria-sort')).toBe('ascending')
    expect(names(wrapper)).toEqual(['Adamczyk', 'Kowalska'])

    await header().find('button').trigger('click')
    expect(header().attributes('aria-sort')).toBe('descending')
    expect(names(wrapper)).toEqual(['Kowalska', 'Adamczyk'])
  })

  it('emits rowClick and shows rows as clickable when a listener is attached', async () => {
    const onRowClick = vi.fn()
    const wrapper = await mountTable({ onRowClick })
    const row = wrapper.find('tbody tr')
    expect(row.classes()).toContain('cursor-pointer')
    await row.trigger('click')
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('does not look or act clickable without a listener', async () => {
    const wrapper = await mountTable()
    const row = wrapper.find('tbody tr')
    expect(row.classes()).not.toContain('cursor-pointer')
    await expect(row.trigger('click')).resolves.toBeUndefined()
  })

  it('highlights rows chosen by isHighlighted', async () => {
    const wrapper = await mountTable({ isHighlighted: (row: Row) => row.unread })
    const [first, second] = wrapper.findAll('tbody tr')
    expect(first!.classes()).not.toContain('font-semibold')
    expect(second!.classes()).toContain('font-semibold')
  })

  it('keeps the rows with a progress bar while refreshing', async () => {
    const wrapper = await mountTable({ status: 'pending' })
    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    expect(names(wrapper)).toHaveLength(2)
  })

  it('shows the skeleton while the first load is pending', async () => {
    vi.useFakeTimers()
    const wrapper = await mountTable({ status: 'pending', rows: undefined })
    vi.advanceTimersByTime(150)
    await wrapper.vm.$nextTick()
    vi.useRealTimers()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('shows the empty state with its action', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: { columns, rows: [], status: 'success', error: null, emptyTitle: 'Nie masz jeszcze klientów.' },
      slots: { 'empty-action': () => 'Dodaj klienta' },
    })
    expect(wrapper.text()).toContain('Nie masz jeszcze klientów.')
    expect(wrapper.text()).toContain('Dodaj klienta')
  })

  it('offers clearing filters when a filtered list is empty', async () => {
    const wrapper = await mountTable({ rows: [], filtered: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('clearFilters')).toHaveLength(1)
  })

  it('shows the error banner and emits retry from both of its actions', async () => {
    const wrapper = await mountTable({ error: new ApiError(503, 'DATABASE_UNAVAILABLE', 'Down.') })
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.get('button').trigger('click')

    await wrapper.setProps({ error: new ApiError(409, 'VERSION_CONFLICT', 'Changed.') })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(2)
  })
})
