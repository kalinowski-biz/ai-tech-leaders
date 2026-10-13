import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { withSetup } from '../../test/helpers/harness'
import { useConfirmDialogState } from './useConfirm'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

const { onBeforeRouteLeave } = vi.hoisted(() => ({ onBeforeRouteLeave: vi.fn() }))
mockNuxtImport('onBeforeRouteLeave', () => onBeforeRouteLeave)

const dialog = useConfirmDialogState()

async function mountGuard(dirty: boolean) {
  const isDirty = ref(dirty)
  const { result } = await withSetup(() => useUnsavedChangesGuard(isDirty))
  const leaveGuard = onBeforeRouteLeave.mock.lastCall?.[0] as () => Promise<boolean>
  return { ...result, isDirty, leaveGuard }
}

function fireBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('useUnsavedChangesGuard', () => {
  afterEach(() => {
    dialog.settle(false)
  })

  it('lets a clean form go without asking', async () => {
    const { confirmDiscard, leaveGuard } = await mountGuard(false)
    await expect(confirmDiscard()).resolves.toBe(true)
    await expect(leaveGuard()).resolves.toBe(true)
    expect(dialog.current.value).toBeNull()
  })

  it('asks before discarding a dirty form', async () => {
    const { confirmDiscard } = await mountGuard(true)
    const answer = confirmDiscard()
    expect(dialog.current.value).toMatchObject({
      title: 'Masz niezapisane zmiany. Odrzucić je?',
      confirmLabel: 'Odrzuć zmiany',
      cancelLabel: 'Wróć do edycji',
      destructive: true,
    })
    dialog.settle(true)
    await expect(answer).resolves.toBe(true)
  })

  it('blocks in-app navigation when the user stays', async () => {
    const { leaveGuard } = await mountGuard(true)
    const answer = leaveGuard()
    dialog.settle(false)
    await expect(answer).resolves.toBe(false)
  })

  it('asks the browser to confirm closing the tab only while dirty', async () => {
    const { isDirty } = await mountGuard(true)
    expect(fireBeforeUnload().defaultPrevented).toBe(true)
    isDirty.value = false
    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })
})
