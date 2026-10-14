import { afterEach, describe, expect, it, vi } from 'vitest'

const system = { name: 'system' }
vi.mock('./setup/system.mjs', () => ({ createSystem: () => system }))
vi.mock('./setup/setup.mjs', () => ({ runSetup: vi.fn(() => 7) }))

describe('scripts/setup.mjs', () => {
  afterEach(() => {
    process.exitCode = undefined
  })

  it('runs the setup against the real system and exits with its code', async () => {
    const { runSetup } = await import('./setup/setup.mjs')
    await import('./setup.mjs')

    expect(runSetup).toHaveBeenCalledWith(system)
    expect(process.exitCode).toBe(7)
  })
})
