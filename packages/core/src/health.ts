/** Port: anything that can tell whether a backing service is reachable. */
export interface HealthProbe {
  ping(): Promise<void>
}

export interface HealthReport {
  status: 'ok' | 'degraded'
  database: 'up' | 'down'
  time: string
}

export interface HealthServiceDeps {
  healthProbe: HealthProbe
}

export class HealthService {
  private readonly probe: HealthProbe

  constructor({ healthProbe }: HealthServiceDeps) {
    this.probe = healthProbe
  }

  async check(): Promise<HealthReport> {
    let database: HealthReport['database'] = 'up'
    try {
      await this.probe.ping()
    } catch {
      database = 'down'
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      time: new Date().toISOString(),
    }
  }
}
