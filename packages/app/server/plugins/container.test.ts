import { afterEach, describe, expect, it, vi } from 'vitest'

type Hook = () => Promise<void>

describe('container Nitro plugin', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disposes the root container when Nitro closes', async () => {
    const disposeRootContainer = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
    vi.stubGlobal('disposeRootContainer', disposeRootContainer)
    const plugin = (await import('./container')).default as unknown as (app: unknown) => void

    const hooks = new Map<string, Hook>()
    plugin({ hooks: { hook: (name: string, fn: Hook) => hooks.set(name, fn) } })
    expect(disposeRootContainer).not.toHaveBeenCalled()

    await hooks.get('close')?.()
    expect(disposeRootContainer).toHaveBeenCalledOnce()
  })
})
