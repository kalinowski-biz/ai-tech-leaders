import type { MaybeRefOrGetter } from 'vue'

const DISCARD_CHANGES = {
  title: 'Masz niezapisane zmiany. Odrzucić je?',
  confirmLabel: 'Odrzuć zmiany',
  cancelLabel: 'Wróć do edycji',
  destructive: true,
} as const

/**
 * Asks before leaving a dirty form (02 §1.3): on in-app navigation, on tab
 * close/reload, and – via `confirmDiscard()` – when a modal is being closed.
 */
export function useUnsavedChangesGuard(isDirty: MaybeRefOrGetter<boolean>) {
  const confirm = useConfirm()

  async function confirmDiscard(): Promise<boolean> {
    return !toValue(isDirty) || (await confirm(DISCARD_CHANGES))
  }

  onBeforeRouteLeave(() => confirmDiscard())

  // Targets `window` in the browser and is a no-op during SSR.
  useEventListener('beforeunload', (event) => {
    if (toValue(isDirty)) event.preventDefault()
  })

  return { confirmDiscard }
}
