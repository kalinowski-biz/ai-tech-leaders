import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOrmConfig } from './config.ts'
import { entities } from './entities/index.ts'

const DATABASE_URL = 'postgresql://user:secret@db.example:5432/app'

describe('createOrmConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires DATABASE_URL', () => {
    expect(() => createOrmConfig({})).toThrow('DATABASE_URL is not set')
  })

  it('applies pool and debug defaults', () => {
    const config = createOrmConfig({ DATABASE_URL })
    expect(config.clientUrl).toBe(DATABASE_URL)
    expect(config.pool).toEqual({ min: 2, max: 10 })
    expect(config.debug).toBe(false)
    expect(config.entities).toBe(entities)
  })

  it('reads pool size and debug flag from the environment', () => {
    const config = createOrmConfig({
      DATABASE_URL,
      DATABASE_POOL_MIN: '1',
      DATABASE_POOL_MAX: '4',
      DATABASE_DEBUG: 'true',
    })
    expect(config.pool).toEqual({ min: 1, max: 4 })
    expect(config.debug).toBe(true)
  })

  it('points migrations at packages/database/migrations, transactional, emitting TypeScript', () => {
    const { migrations } = createOrmConfig({ DATABASE_URL })
    expect(migrations?.path).toMatch(/packages\/database\/migrations$/)
    expect(migrations).toMatchObject({ transactional: true, emit: 'ts' })
  })

  it('defaults to process.env', () => {
    vi.stubEnv('DATABASE_URL', DATABASE_URL)
    expect(createOrmConfig().clientUrl).toBe(DATABASE_URL)
  })
})
