import { asClass, asValue, Lifetime, type AwilixContainer } from 'awilix'
import { HealthService, type HealthProbe } from './health.ts'
import { systemClock, type Clock } from './shared/clock.ts'

/** Cradle entries contributed by this package. */
export interface CoreCradle {
  clock: Clock
  healthService: HealthService
}

/** Ports that other packages must provide (resolved lazily from the cradle). */
export interface CoreRequiredCradle {
  healthProbe: HealthProbe
}

export function registerCore(container: AwilixContainer): void {
  container.register({
    clock: asValue(systemClock),
    healthService: asClass(HealthService, { lifetime: Lifetime.SCOPED }),
  })
}
