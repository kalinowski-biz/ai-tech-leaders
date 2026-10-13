import { describe, expect, it } from 'vitest'
import { ApiError } from './api-error'
import { apiErrorMessage, fieldErrorMessage } from './messages'

describe('apiErrorMessage', () => {
  it('prefers the text for the code over the one for the status', () => {
    expect(apiErrorMessage(new ApiError(503, 'DATABASE_UNAVAILABLE', 'Down.'))).toBe(
      'Baza danych jest niedostępna. Spróbuj ponownie za chwilę.',
    )
  })

  it.each([
    [401, 'Sesja wygasła. Zaloguj się ponownie.'],
    [404, 'Nie znaleziono zasobu albo nie masz do niego dostępu.'],
    [409, 'Stan rekordu zmienił się w międzyczasie. Odśwież widok.'],
    [410, 'Ten link jest już nieaktualny.'],
    [422, 'Popraw zaznaczone pola.'],
  ])('uses the text for status %i when the code is unknown', (status, text) => {
    expect(apiErrorMessage(new ApiError(status, 'SOMETHING_NEW', 'x'))).toBe(text)
  })
})

describe('fieldErrorMessage', () => {
  it.each([
    ['required', 'To pole jest wymagane.'],
    ['invalid_phone', 'Podaj 9-cyfrowy numer telefonu (opcjonalnie z +48).'],
    ['too_big', 'Wartość jest za duża lub za długa.'],
  ])('translates %s', (code, text) => {
    expect(fieldErrorMessage(code)).toBe(text)
  })

  it('falls back to a generic text for unknown codes', () => {
    expect(fieldErrorMessage('invalid_union')).toBe('Nieprawidłowa wartość.')
  })
})
