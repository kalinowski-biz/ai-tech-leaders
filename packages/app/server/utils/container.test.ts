import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HealthService, systemClock } from '@tripsalesagent/core'
import { fakeEvent } from '../../test/helpers/h3-event'
import { disposeRootContainer, useRootContainer, useScope } from './container'

describe('composition root', () => {
  beforeEach(() => {
    // Nothing listens on port 1; these tests never open a connection.
    vi.stubEnv('DATABASE_URL', 'postgresql://user:secret@127.0.0.1:1/app')
  })

  afterEach(async () => {
    await disposeRootContainer()
    vi.unstubAllEnvs()
  })

  it('creates the root container once, lazily', () => {
    expect(useRootContainer()).toBe(useRootContainer())
  })

  it('wires core and database together', () => {
    const scope = useRootContainer().createScope()
    expect(scope.resolve('clock')).toBe(systemClock)
    expect(scope.resolve('healthService')).toBeInstanceOf(HealthService)
  })

  it('disposes the root container and starts a fresh one afterwards', async () => {
    const first = useRootContainer()
    const close = vi.spyOn(first.resolve('orm'), 'close')
    await disposeRootContainer()
    expect(close).toHaveBeenCalledOnce()
    expect(useRootContainer()).not.toBe(first)
  })

  it('tolerates disposing when no container exists', async () => {
    await disposeRootContainer()
    await expect(disposeRootContainer()).resolves.toBeUndefined()
  })
})

describe('useScope', () => {
  afterEach(() => disposeRootContainer())

  it('creates one scope per request and reuses it within the request', () => {
    const event = fakeEvent()
    const scope = useScope(event)
    expect(event.context.scope).toBe(scope)
    expect(useScope(event)).toBe(scope)
    expect(useScope(fakeEvent())).not.toBe(scope)
  })

  it('disposes the scope when the response is closed', () => {
    const event = fakeEvent()
    const dispose = vi.spyOn(useScope(event), 'dispose')
    event.node.res.emit('close')
    expect(dispose).toHaveBeenCalledOnce()
  })
})
