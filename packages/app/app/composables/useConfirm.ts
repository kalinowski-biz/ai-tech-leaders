export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

/**
 * One confirmation dialog for the whole app (rendered by `AppConfirmDialog`
 * in `app.vue`). Module state is safe here: confirmations only ever open in the
 * browser, from user events, never during SSR.
 */
const current = shallowRef<PendingConfirm | null>(null)

/** `if (await confirm({ title: 'Anulować rezerwację?', confirmLabel: 'Anuluj rezerwację' })) …` */
export function useConfirm() {
  return (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      current.value?.resolve(false)
      current.value = { ...options, resolve }
    })
}

export function useConfirmDialogState() {
  function settle(confirmed: boolean): void {
    current.value?.resolve(confirmed)
    current.value = null
  }
  return { current: readonly(current), settle }
}
