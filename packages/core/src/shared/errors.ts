/**
 * Domain error hierarchy. Services throw only these; the app maps `kind` to an
 * HTTP status (packages/app/server/utils/api-handler.ts). `code` is a stable,
 * machine-readable identifier the UI may branch on; `message` is for humans.
 */
export type DomainErrorKind =
  'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'GONE' | 'UNAVAILABLE'

export interface FieldError {
  /** Dot-separated path of the offending input field, e.g. `group.students`. */
  field: string
  /** Machine-readable reason, e.g. `required`, `too_small`, `invalid_nip`. */
  code: string
}

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind

  constructor(
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
  }
}

export class UnauthorizedError extends DomainError {
  readonly kind = 'UNAUTHORIZED'
  constructor(message = 'Authentication required.') {
    super('UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends DomainError {
  readonly kind = 'FORBIDDEN'
  constructor(message = 'You do not have access to this resource.') {
    super('FORBIDDEN', message)
  }
}

/** Also used for records the actor may not see, so their existence is not revealed. */
export class NotFoundError extends DomainError {
  readonly kind = 'NOT_FOUND'
  constructor(resource: string, message = `${resource} not found.`) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, message)
  }
}

export class ValidationError extends DomainError {
  readonly kind = 'VALIDATION'
  constructor(
    readonly fields: FieldError[],
    message = 'Invalid input.',
  ) {
    super('VALIDATION_FAILED', message)
  }
}

/** Version mismatch (optimistic lock / `If-Match`). */
export class VersionConflictError extends DomainError {
  readonly kind = 'CONFLICT'
  constructor(message = 'The record was changed by someone else. Reload it and try again.') {
    super('VERSION_CONFLICT', message)
  }
}

/** A business rule forbids the operation in the current state (e.g. invalid status transition). */
export class RuleConflictError extends DomainError {
  readonly kind = 'CONFLICT'
}

/** A one-time or public token that is no longer valid (expired, used, superseded). */
export class GoneError extends DomainError {
  readonly kind = 'GONE'
}

/** A backing service (database, mailer, storage) is unreachable. */
export class UnavailableError extends DomainError {
  readonly kind = 'UNAVAILABLE'
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
