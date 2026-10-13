/**
 * Error body of every `/api/v1` endpoint (inside h3's `data`), shared by the
 * server (`defineApiHandler`) and the client (`useApi`).
 */
export interface ApiErrorBody {
  /** Stable machine-readable code, e.g. `VERSION_CONFLICT`, `INQUIRY_NOT_FOUND`. */
  code: string
  message: string
  /** Present for 422: one entry per invalid field. */
  fields?: ApiFieldError[]
}

export interface ApiFieldError {
  field: string
  code: string
}

/** Header the client sets on every API call; checked by the CSRF middleware. */
export const API_CLIENT_HEADER = 'x-requested-with'
export const API_CLIENT_HEADER_VALUE = 'tripsalesagent'
