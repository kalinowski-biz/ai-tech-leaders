import type { Clock } from './shared/clock.ts'
import { UnavailableError } from './shared/errors.ts'

/** Port: anything that can tell whether a backing service is reachable. */
export interface HealthProbe {
  ping(): Promise<void>
}

export interface HealthReport {
  status: 'ok'
  database: 'up'
  time: string
}

export interface HealthServiceDeps {
  healthProbe: HealthProbe
  clock: Clock
}

export class HealthService {
  private readonly probe: HealthProbe
  private readonly clock: Clock

  constructor({ healthProbe, clock }: HealthServiceDeps) {
    this.probe = healthProbe
    this.clock = clock
  }

  /** Returns the report, or throws `UnavailableError` (HTTP 503) when the database is unreachable. */
  async check(): Promise<HealthReport> {
    try {
      await this.probe.ping()
    } catch (error) {
      throw new UnavailableError('DATABASE_UNAVAILABLE', 'The database is unreachable.', { cause: error })
    }
    return { status: 'ok', database: 'up', time: this.clock.now().toISOString() }
  }
}
