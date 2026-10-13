import { MikroORM } from '@mikro-orm/postgresql'
import { describe, expect, it } from 'vitest'
import { createOrm } from './orm.ts'

describe('createOrm', () => {
  it('creates the ORM synchronously without connecting', async () => {
    // Port 1 is never listening: any connection attempt here would fail the test.
    const orm = createOrm({ DATABASE_URL: 'postgresql://user:secret@127.0.0.1:1/app' })
    expect(orm).toBeInstanceOf(MikroORM)
    expect(orm.config.get('clientUrl')).toBe('postgresql://user:secret@127.0.0.1:1/app')
    await expect(orm.isConnected()).resolves.toBe(false)
    await orm.close()
  })
})
