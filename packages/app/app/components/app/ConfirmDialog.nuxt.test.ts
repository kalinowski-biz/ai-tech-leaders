import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useConfirm, useConfirmDialogState } from '../../composables/useConfirm'
import ConfirmDialog from './ConfirmDialog.vue'

/** The dialog is teleported to <body>. */
const dialog = () => document.body.querySelector<HTMLElement>('[role="alertdialog"]')
const button = (text: string) =>
  [...document.body.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === text)

/** Mounts the dialog host and asks; returns the pending answer wrapped, so awaiting `open` does not await it. */
async function open(options: Parameters<ReturnType<typeof useConfirm>>[0]) {
  await mountSuspended(ConfirmDialog, { attachTo: document.body })
  const answer = useConfirm()(options)
  await flushPromises()
  return { answer }
}

describe('AppConfirmDialog', () => {
  afterEach(() => useConfirmDialogState().settle(false))

  it('is closed until something asks for confirmation', async () => {
    await mountSuspended(ConfirmDialog, { attachTo: document.body })
    expect(dialog()).toBeNull()
  })

  it('shows the question and resolves true on confirm', async () => {
    const { answer } = await open({
      title: 'Anulować rezerwację?',
      description: 'Klient dostanie powiadomienie.',
      confirmLabel: 'Anuluj rezerwację',
      destructive: true,
    })
    expect(dialog()?.textContent).toContain('Anulować rezerwację?')
    expect(dialog()?.textContent).toContain('Klient dostanie powiadomienie.')
    expect(button('Anuluj rezerwację')?.dataset.variant).toBe('destructive')
    button('Anuluj rezerwację')?.click()
    await expect(answer).resolves.toBe(true)
    await flushPromises()
    expect(dialog()).toBeNull()
  })

  it('resolves false on the default cancel button', async () => {
    const { answer } = await open({ title: 'Wysłać?', confirmLabel: 'Wyślij' })
    expect(button('Wyślij')?.dataset.variant).toBe('default')
    expect(dialog()?.querySelector('p')).toBeNull()
    button('Anuluj')?.click()
    await expect(answer).resolves.toBe(false)
  })

  it('uses a custom cancel label', async () => {
    const { answer } = await open({
      title: 'Odrzucić zmiany?',
      confirmLabel: 'Odrzuć',
      cancelLabel: 'Wróć do edycji',
    })
    button('Wróć do edycji')?.click()
    await expect(answer).resolves.toBe(false)
  })

  it('resolves false when dismissed with Escape', async () => {
    const { answer } = await open({ title: 'Wysłać?', confirmLabel: 'Wyślij' })
    dialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(answer).resolves.toBe(false)
  })
})
