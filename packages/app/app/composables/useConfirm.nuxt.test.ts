import { afterEach, describe, expect, it } from 'vitest'
import { useConfirm, useConfirmDialogState } from './useConfirm'

const options = { title: 'Anulować rezerwację?', confirmLabel: 'Anuluj rezerwację', destructive: true }

describe('useConfirm', () => {
  const state = useConfirmDialogState()

  afterEach(() => state.settle(false))

  it('opens the dialog with the given options and resolves with the answer', async () => {
    const answer = useConfirm()(options)
    expect(state.current.value).toMatchObject(options)
    state.settle(true)
    await expect(answer).resolves.toBe(true)
    expect(state.current.value).toBeNull()
  })

  it('resolves false when cancelled', async () => {
    const answer = useConfirm()(options)
    state.settle(false)
    await expect(answer).resolves.toBe(false)
  })

  it('cancels a pending confirmation when a new one opens', async () => {
    const confirm = useConfirm()
    const first = confirm(options)
    const second = confirm({ title: 'Odrzucić zmiany?', confirmLabel: 'Odrzuć' })
    await expect(first).resolves.toBe(false)
    expect(state.current.value?.title).toBe('Odrzucić zmiany?')
    state.settle(true)
    await expect(second).resolves.toBe(true)
  })

  it('ignores settling when nothing is open', () => {
    expect(() => state.settle(true)).not.toThrow()
    expect(state.current.value).toBeNull()
  })
})
