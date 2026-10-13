import type { EntityClass, EntitySchema } from '@mikro-orm/core'

/**
 * Entity registry. Add every MikroORM entity here so it is discovered both by
 * the app (Nitro bundle) and by the CLI (migrations).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const entities: (EntityClass<any> | EntitySchema)[] = []
