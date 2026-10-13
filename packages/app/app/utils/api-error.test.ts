import { describe, expect, it, vi } from 'vitest'
import { ApiError, toApiError } from './api-error'
import { apiErrorMessage } from './messages'

describe('toApiError', () => {
  it('reads the h3 error payload of a FetchError', () => {
    const fetchError = {
      statusCode: 409,
      data: {
        statusCode: 409,
        message: 'VERSION_CONFLICT',
        data: { code: 'VERSION_CONFLICT', message: 'Changed.' },
      },
    }
    const error = toApiError(fetchError)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.isVersionConflict).toBe(true)
    expect(apiErrorMessage(error)).toMatch(/^Ktoś zmienił ten rekord/)
  })

  it('keeps field errors of a 422', () => {
    const error = toApiError({
      statusCode: 422,
      data: {
        data: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid.',
          fields: [{ field: 'nip', code: 'invalid_nip' }],
        },
      },
    })
    expect(error.fields).toEqual([{ field: 'nip', code: 'invalid_nip' }])
  })

  it('unwraps an ApiError carried as cause (useAsyncData wraps errors)', () => {
    const original = new ApiError(404, 'INQUIRY_NOT_FOUND', 'Not found.')
    expect(toApiError({ statusCode: 404, cause: original })).toBe(original)
  })

  it('treats a FetchError without a response as a network error', () => {
    const error = toApiError(Object.assign(new Error('fetch failed'), { name: 'FetchError' }))
    expect(error.code).toBe('NETWORK_ERROR')
    expect(apiErrorMessage(error)).toBe('Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.')
  })

  it('does not disguise a programming error as a network error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(toApiError(new TypeError('x.raw is not a function')).code).toBe('CLIENT_ERROR')
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })

  it('falls back to the status message for unknown codes', () => {
    expect(apiErrorMessage(new ApiError(403, 'SOMETHING', 'x'))).toBe('Nie masz dostępu do tego zasobu.')
  })
})
