import { describe, expect, it } from 'vitest'
import {
  ForbiddenError,
  GoneError,
  isDomainError,
  NotFoundError,
  RuleConflictError,
  UnauthorizedError,
  UnavailableError,
  ValidationError,
  VersionConflictError,
} from './errors.ts'

describe('domain errors', () => {
  it.each([
    [new UnauthorizedError(), 'UNAUTHORIZED', 'UNAUTHORIZED', 'Authentication required.'],
    [new ForbiddenError(), 'FORBIDDEN', 'FORBIDDEN', 'You do not have access to this resource.'],
    [new NotFoundError('Inquiry'), 'NOT_FOUND', 'INQUIRY_NOT_FOUND', 'Inquiry not found.'],
    [new ValidationError([]), 'VALIDATION', 'VALIDATION_FAILED', 'Invalid input.'],
    [
      new VersionConflictError(),
      'CONFLICT',
      'VERSION_CONFLICT',
      'The record was changed by someone else. Reload it and try again.',
    ],
    [new RuleConflictError('INVALID_TRANSITION', 'No.'), 'CONFLICT', 'INVALID_TRANSITION', 'No.'],
    [new GoneError('QUOTE_EXPIRED', 'Expired.'), 'GONE', 'QUOTE_EXPIRED', 'Expired.'],
    [new UnavailableError('DATABASE_UNAVAILABLE', 'Down.'), 'UNAVAILABLE', 'DATABASE_UNAVAILABLE', 'Down.'],
  ])('%o has kind, code and default message', (error, kind, code, message) => {
    expect(error.kind).toBe(kind)
    expect(error.code).toBe(code)
    expect(error.message).toBe(message)
    expect(error.name).toBe(error.constructor.name)
    expect(isDomainError(error)).toBe(true)
  })

  it('accepts custom messages', () => {
    expect(new UnauthorizedError('Log in.').message).toBe('Log in.')
    expect(new ForbiddenError('No.').message).toBe('No.')
    expect(new NotFoundError('Client', 'Gone.').message).toBe('Gone.')
    expect(new ValidationError([], 'Bad.').message).toBe('Bad.')
    expect(new VersionConflictError('Stale.').message).toBe('Stale.')
  })

  it('keeps the field errors and the cause', () => {
    const fields = [{ field: 'nip', code: 'invalid_nip' }]
    expect(new ValidationError(fields).fields).toBe(fields)
    const cause = new Error('ECONNREFUSED')
    expect(new UnavailableError('DOWN', 'Down.', { cause }).cause).toBe(cause)
  })

  it('recognizes only domain errors', () => {
    expect(isDomainError(new Error('x'))).toBe(false)
    expect(isDomainError({ kind: 'NOT_FOUND', code: 'X' })).toBe(false)
    expect(isDomainError(undefined)).toBe(false)
  })
})
