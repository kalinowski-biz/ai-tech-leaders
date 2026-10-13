import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LoadingSkeleton from './LoadingSkeleton.vue'

type Props = InstanceType<typeof LoadingSkeleton>['$props']

async function mountVisible(props: Props = {}) {
  const wrapper = await mountSuspended(LoadingSkeleton, { props })
  vi.advanceTimersByTime(150)
  await nextTick()
  return wrapper
}

const skeletons = (wrapper: Awaited<ReturnType<typeof mountVisible>>) =>
  wrapper.findAll('[data-slot="skeleton"]')

describe('AppLoadingSkeleton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays invisible for the first 150 ms so fast responses do not flash', async () => {
    const wrapper = await mountSuspended(LoadingSkeleton)
    vi.advanceTimersByTime(149)
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('draws a table by default: a header and five rows', async () => {
    const wrapper = await mountVisible()
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Wczytywanie')
    expect(skeletons(wrapper)).toHaveLength(6)
  })

  it('draws cards', async () => {
    const wrapper = await mountVisible({ variant: 'cards', rows: 3 })
    expect(wrapper.find('.grid').exists()).toBe(true)
    expect(skeletons(wrapper)).toHaveLength(3)
  })

  it('draws form fields: a label and an input each', async () => {
    const wrapper = await mountVisible({ variant: 'form', rows: 2 })
    expect(skeletons(wrapper)).toHaveLength(4)
  })
})
