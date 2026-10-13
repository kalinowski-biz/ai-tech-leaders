import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { withSetup } from '../../test/helpers/harness'
import { ApiError } from '../utils/api-error'
import { COUNTERS_QUERY_KEY, LOGIN_PATH, useMutation } from './useMutation'

const { navigateTo, refreshNuxtData, toastSuccess } = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  refreshNuxtData: vi.fn(),
  toastSuccess: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('refreshNuxtData', () => refreshNuxtData)
vi.mock('vue-sonner', () => ({ toast: { success: toastSuccess } }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useMutation', () => {
  it('runs the action, toasts, refreshes counters and the given queries, then calls onSuccess', async () => {
    const onSuccess = vi.fn()
    const { result } = await withSetup(() =>
      useMutation(async (id: string) => ({ id }), {
        success: 'Opublikowano',
        refresh: ['offers'],
        onSuccess,
      }),
    )
    await expect(result.run('o-1')).resolves.toEqual({ id: 'o-1' })
    expect(toastSuccess).toHaveBeenCalledWith('Opublikowano')
    expect(refreshNuxtData).toHaveBeenCalledWith([COUNTERS_QUERY_KEY, 'offers'])
    expect(onSuccess).toHaveBeenCalledWith({ id: 'o-1' })
    expect(result.error.value).toBeNull()
    expect(result.pending.value).toBe(false)
  })

  it('stays silent without a success text and always refreshes the counters', async () => {
    const { result } = await withSetup(() => useMutation(async () => 'done'))
    await result.run()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(refreshNuxtData).toHaveBeenCalledWith([COUNTERS_QUERY_KEY])
  })

  it('ignores repeated runs while pending', async () => {
    let finish!: () => void
    const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    const { result } = await withSetup(() => useMutation(action))
    const first = result.run()
    expect(result.pending.value).toBe(true)
    await expect(result.run()).resolves.toBeUndefined()
    finish()
    await first
    expect(action).toHaveBeenCalledOnce()
    expect(result.pending.value).toBe(false)
  })

  it('exposes a failure as error and clears it on the next run', async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError(409, 'INVALID_TRANSITION', 'No.'))
      .mockResolvedValueOnce('ok')
    const { result } = await withSetup(() => useMutation(action, { success: 'Zapisano' }))
    await expect(result.run()).resolves.toBeUndefined()
    expect(result.error.value).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' })
    expect(toastSuccess).not.toHaveBeenCalled()

    await result.run()
    expect(result.error.value).toBeNull()
  })

  it('redirects to the login page on 401, keeping the current path', async () => {
    const { result } = await withSetup(() =>
      useMutation(() => Promise.reject(new ApiError(401, 'UNAUTHORIZED', 'Log in.'))),
    )
    await expect(result.run()).resolves.toBeUndefined()
    expect(navigateTo).toHaveBeenCalledWith({ path: LOGIN_PATH, query: { redirect: '/' } })
    expect(result.error.value).toBeNull()
  })
})
