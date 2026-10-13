import { getQuery, getRouterParams, readBody, type H3Event } from 'h3'
import type { z } from 'zod'
import { parseInput } from '@tripsalesagent/core'

/**
 * The only way handlers read input: through a shared zod schema, so a 422 has
 * the same `[{ field, code }]` shape everywhere and services never receive raw
 * request bodies (no mass assignment).
 */
export async function readValidBody<S extends z.ZodType>(event: H3Event, schema: S): Promise<z.output<S>> {
  return parseInput(schema, await readBody(event))
}

export function getValidQuery<S extends z.ZodType>(event: H3Event, schema: S): z.output<S> {
  return parseInput(schema, getQuery(event))
}

export function getValidParams<S extends z.ZodType>(event: H3Event, schema: S): z.output<S> {
  return parseInput(schema, getRouterParams(event, { decode: true }))
}
