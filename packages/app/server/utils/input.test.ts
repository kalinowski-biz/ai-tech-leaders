import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { emailSchema, ValidationError } from '@tripsalesagent/core'
import { fakeEvent } from '../../test/helpers/h3-event'
import { getValidParams, getValidQuery, readValidBody } from './input'

describe('readValidBody', () => {
  const schema = z.object({ email: emailSchema })

  it('returns the parsed body and drops unknown keys (no mass assignment)', async () => {
    const event = fakeEvent({ method: 'POST', body: { email: ' Jan@Example.PL ', role: 'OFFICE' } })
    await expect(readValidBody(event, schema)).resolves.toEqual({ email: 'jan@example.pl' })
  })

  it('throws a ValidationError for an invalid body', async () => {
    const event = fakeEvent({ method: 'POST', body: { email: 'nope' } })
    await expect(readValidBody(event, schema)).rejects.toEqual(
      new ValidationError([{ field: 'email', code: 'invalid_email' }]),
    )
  })
})

describe('getValidQuery', () => {
  const schema = z.object({ status: z.enum(['NEW', 'SENT']), page: z.coerce.number().int().min(1) })

  it('parses the query string', () => {
    expect(getValidQuery(fakeEvent({ url: '/api/v1/inquiries?status=NEW&page=2' }), schema)).toEqual({
      status: 'NEW',
      page: 2,
    })
  })

  it('throws a ValidationError for an invalid query', () => {
    expect(() => getValidQuery(fakeEvent({ url: '/api/v1/inquiries?status=LOST&page=1' }), schema)).toThrow(
      ValidationError,
    )
  })
})

describe('getValidParams', () => {
  const schema = z.object({ inquiryId: z.uuid() })
  const id = '0b5cfa52-8f63-4d6a-9c2e-1f2a3b4c5d6e'

  it('parses decoded router params', () => {
    const event = fakeEvent()
    event.context.params = { inquiryId: encodeURIComponent(id) }
    expect(getValidParams(event, schema)).toEqual({ inquiryId: id })
  })

  it('throws a ValidationError for invalid params', () => {
    const event = fakeEvent()
    event.context.params = { inquiryId: '42' }
    expect(() => getValidParams(event, schema)).toThrow(ValidationError)
  })
})
