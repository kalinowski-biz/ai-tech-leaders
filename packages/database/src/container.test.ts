import { createContainer, InjectionMode } from 'awilix'
import { MikroORM } from '@mikro-orm/postgresql'
import { describe, expect, it, vi } from 'vitest'
import { registerDatabase, type DatabaseCradle } from './container.ts'

const env = { DATABASE_URL: 'postgresql://user:secret@127.0.0.1:1/app' }

function container() {
  const root = createContainer<DatabaseCradle>({ injectionMode: InjectionMode.PROXY, strict: true })
  registerDatabase(root, env)
  return root
}

describe('registerDatabase', () => {
  it('registers one ORM for the whole container, built from the given env', async () => {
    const root = container()
    const orm = root.resolve('orm')
    expect(orm).toBeInstanceOf(MikroORM)
    expect(orm.config.get('clientUrl')).toBe(env.DATABASE_URL)
    expect(root.createScope().resolve('orm')).toBe(orm)
    await root.dispose()
  })

  it('gives every scope its own EntityManager fork', async () => {
    const root = container()
    const first = root.createScope()
    const second = root.createScope()
    const em = first.resolve('em')
    expect(em).not.toBe(root.resolve('orm').em)
    expect(first.resolve('em')).toBe(em)
    expect(second.resolve('em')).not.toBe(em)
    await root.dispose()
  })

  it('implements the health probe with a trivial query on the scoped EntityManager', async () => {
    const root = container()
    const scope = root.createScope()
    const execute = vi.fn().mockResolvedValue([{ '?column?': 1 }])
    vi.spyOn(scope.resolve('em'), 'getConnection').mockReturnValue({ execute } as never)
    await expect(scope.resolve('healthProbe').ping()).resolves.toBeUndefined()
    expect(execute).toHaveBeenCalledWith('select 1')
    await root.dispose()
  })

  it('closes the ORM when the container is disposed', async () => {
    const root = container()
    const close = vi.spyOn(root.resolve('orm'), 'close')
    await root.dispose()
    expect(close).toHaveBeenCalledOnce()
  })
})
