import { asValue, createContainer, InjectionMode } from 'awilix'
import { describe, expect, it } from 'vitest'
import { registerCore, type CoreCradle, type CoreRequiredCradle } from './container.ts'
import { HealthService } from './health.ts'
import { systemClock } from './shared/clock.ts'

describe('registerCore', () => {
  function container() {
    const root = createContainer<CoreCradle & CoreRequiredCradle>({
      injectionMode: InjectionMode.PROXY,
      strict: true,
    })
    registerCore(root)
    root.register({ healthProbe: asValue({ ping: async () => {} }) })
    return root
  }

  it('registers the system clock as a value', () => {
    expect(container().resolve('clock')).toBe(systemClock)
  })

  it('registers HealthService per scope', () => {
    const root = container()
    const scope = root.createScope()
    expect(scope.resolve('healthService')).toBeInstanceOf(HealthService)
    expect(scope.resolve('healthService')).toBe(scope.resolve('healthService'))
    expect(root.createScope().resolve('healthService')).not.toBe(scope.resolve('healthService'))
  })
})
