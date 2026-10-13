import type { ApiError } from './api-error'

/**
 * Polish UI texts for API errors (02-specyfikacja-ekranow.md §1.2). The server's
 * `message` is for developers; the UI shows text chosen by `code`, falling back
 * to the HTTP status. Concept-specific codes are added here as concepts land.
 */
const MESSAGES_BY_CODE: Record<string, string> = {
  VERSION_CONFLICT: 'Ktoś zmienił ten rekord w międzyczasie. Wczytaj aktualną wersję i powtórz zmianę.',
  NETWORK_ERROR: 'Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.',
  DATABASE_UNAVAILABLE: 'Baza danych jest niedostępna. Spróbuj ponownie za chwilę.',
  VALIDATION_FAILED: 'Popraw zaznaczone pola.',
}

const MESSAGES_BY_STATUS: Record<number, string> = {
  401: 'Sesja wygasła. Zaloguj się ponownie.',
  403: 'Nie masz dostępu do tego zasobu.',
  404: 'Nie znaleziono zasobu albo nie masz do niego dostępu.',
  409: 'Stan rekordu zmienił się w międzyczasie. Odśwież widok.',
  410: 'Ten link jest już nieaktualny.',
  422: 'Popraw zaznaczone pola.',
}

const FALLBACK = 'Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.'

export function apiErrorMessage(error: ApiError): string {
  return MESSAGES_BY_CODE[error.code] ?? MESSAGES_BY_STATUS[error.status] ?? FALLBACK
}

/** Field-level texts for the stable codes emitted by shared schemas (core/src/shared/validation.ts) and zod. */
const FIELD_MESSAGES: Record<string, string> = {
  required: 'To pole jest wymagane.',
  invalid_type: 'To pole jest wymagane.',
  too_small: 'Wartość jest za mała lub za krótka.',
  too_big: 'Wartość jest za duża lub za długa.',
  invalid_email: 'Podaj poprawny adres e-mail.',
  invalid_phone: 'Podaj 9-cyfrowy numer telefonu (opcjonalnie z +48).',
  invalid_nip: 'NIP musi mieć 10 cyfr i poprawną sumę kontrolną.',
}

export function fieldErrorMessage(code: string): string {
  return FIELD_MESSAGES[code] ?? 'Nieprawidłowa wartość.'
}
