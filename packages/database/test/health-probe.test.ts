import { createContainer, InjectionMode } from 'awilix'
import { afterEach, describe, expect, inject, it } from 'vitest'
import { registerDatabase, type DatabaseCradle } from '../src/container.ts'
import { applyMigrations } from './support/postgres.ts'

const containers: ReturnType<typeof createContainer<DatabaseCradle>>[] = []

function scopeFor(DATABASE_URL: string) {
  const root = createContainer<DatabaseCradle>({ injectionMode: InjectionMode.PROXY, strict: true })
  registerDatabase(root, { DATABASE_URL, DATABASE_POOL_MIN: '0' })
  containers.push(root)
  return root.createScope()
}

describe('database against a real PostgreSQL', () => {
  afterEach(async () => {
    await Promise.all(containers.splice(0).map((container) => container.dispose()))
  })

  it('answers the health probe through the scoped EntityManager', async () => {
    await expect(scopeFor(inject('databaseUrl')).resolve('healthProbe').ping()).resolves.toBeUndefined()
  })

  it('rejects the health probe when the database is unreachable', async () => {
    const unreachable = 'postgresql://user:secret@127.0.0.1:1/none'
    await expect(scopeFor(unreachable).resolve('healthProbe').ping()).rejects.toThrow()
  })

  it('has no pending migrations after setup, and re-applying is a no-op', async () => {
    const orm = scopeFor(inject('databaseUrl')).resolve('orm')
    await expect(orm.migrator.getPending()).resolves.toEqual([])
    await expect(applyMigrations(inject('databaseUrl'))).resolves.toBeUndefined()
  })
})
