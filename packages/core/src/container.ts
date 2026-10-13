import { asClass, Lifetime, type AwilixContainer } from 'awilix'
import { HealthService, type HealthProbe } from './health.ts'

/** Cradle entries contributed by this package. */
export interface CoreCradle {
  healthService: HealthService
}

/** Ports that other packages must provide (resolved lazily from the cradle). */
export interface CoreRequiredCradle {
  healthProbe: HealthProbe
}

export function registerCore(container: AwilixContainer): void {
  container.register({
    healthService: asClass(HealthService, { lifetime: Lifetime.SCOPED }),
  })
}
