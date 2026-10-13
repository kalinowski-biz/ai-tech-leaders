import { describe, expect, it, vi } from 'vitest'
import { createError, type H3Error } from 'h3'
import {
  NotFoundError,
  RuleConflictError,
  UnavailableError,
  ValidationError,
  VersionConflictError,
} from '@tripsalesagent/core'
import { fakeEvent } from '../../test/helpers/h3-event'
import { defineApiHandler, toHttpError } from './api-handler'

function map(error: unknown): H3Error {
  return toHttpError(fakeEvent({ method: 'POST', url: '/api/v1/inquiries/42/take-over' }), error) as H3Error
}

describe('defineApiHandler', () => {
  it('returns the handler result', async () => {
    const handler = defineApiHandler(async () => ({ ok: true }))
    await expect(handler(fakeEvent())).resolves.toEqual({ ok: true })
  })

  it('maps thrown domain errors to HTTP errors', async () => {
    const handler = defineApiHandler(() => {
      throw new NotFoundError('Client')
    })
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 404,
      data: { code: 'CLIENT_NOT_FOUND', message: 'Client not found.' },
    })
  })
})

describe('toHttpError', () => {
  it.each([
    [new NotFoundError('Inquiry'), 404, 'INQUIRY_NOT_FOUND'],
    [new VersionConflictError(), 409, 'VERSION_CONFLICT'],
    [new RuleConflictError('INVALID_TRANSITION', 'Status changed.'), 409, 'INVALID_TRANSITION'],
    [new UnavailableError('DATABASE_UNAVAILABLE', 'Down.'), 503, 'DATABASE_UNAVAILABLE'],
  ])('maps %o to %i with its code', (error, status, code) => {
    const http = map(error)
    expect(http.statusCode).toBe(status)
    expect(http.data).toMatchObject({ code })
  })

  it('carries field errors for 422', () => {
    const http = map(new ValidationError([{ field: 'nip', code: 'invalid_nip' }]))
    expect(http.statusCode).toBe(422)
    expect(http.data).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Invalid input.',
      fields: [{ field: 'nip', code: 'invalid_nip' }],
    })
  })

  it('passes h3 errors through untouched', () => {
    const original = createError({ statusCode: 428 })
    expect(map(original)).toBe(original)
  })

  it('hides unexpected errors behind a generic 500 and logs them', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const http = map(new Error('relation "inquiry" does not exist'))
    expect(http.statusCode).toBe(500)
    expect(http.data).toEqual({ code: 'INTERNAL_ERROR', message: 'Unexpected server error.' })
    expect(JSON.stringify(http.data)).not.toContain('relation')
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })
})
