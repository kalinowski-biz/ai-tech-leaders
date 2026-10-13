import { defineComponent, h, type VNodeChild } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'

/**
 * Runs a composable inside a mounted component (setup context, Nuxt app,
 * router) and returns what it returned. `render` may draw elements the
 * composable interacts with.
 */
export async function withSetup<T>(composable: () => T, render: (result: T) => VNodeChild = () => null) {
  let result!: T
  const Harness = defineComponent({
    setup() {
      result = composable()
      return () => h('div', [render(result)])
    },
  })
  const wrapper = await mountSuspended(Harness, { attachTo: document.body })
  return { result, wrapper }
}
