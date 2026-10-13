import { z } from 'zod'
import { ValidationError, type FieldError } from './errors.ts'

/**
 * Field schemas shared by every concept and by both sides of the wire
 * (Nitro handlers and vee-validate forms). Error `message`s are stable codes,
 * not prose: the UI maps them to Polish text.
 */

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const

export function isValidNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false
  const digits = [...nip].map(Number)
  const sum = NIP_WEIGHTS.reduce((acc, weight, i) => acc + weight * digits[i]!, 0)
  return sum % 11 === digits[9]
}

/** NIP: 10 digits with checksum; separators are stripped. */
export const nipSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine(isValidNip, { error: 'invalid_nip' })

/** Polish phone: 9 digits, optional +48 prefix; normalized to `+48XXXXXXXXX`. */
export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^\+48/, ''))
  .refine((digits) => /^\d{9}$/.test(digits), { error: 'invalid_phone' })
  .transform((digits) => `+48${digits}`)

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'invalid_email' }))

/** Our schemas set `error` to a snake_case code; zod's own defaults are prose. */
const STABLE_CODE = /^[a-z][a-z0-9_]*$/

/** The stable code of a zod issue: our custom code when set, otherwise zod's issue code. */
export function issueCode(issue: z.core.$ZodIssue): string {
  return STABLE_CODE.test(issue.message) ? issue.message : issue.code
}

/** Turns zod issues into the API's 422 payload (`[{ field, code }]`). */
export function toValidationError(error: z.ZodError): ValidationError {
  const fields: FieldError[] = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    code: issueCode(issue),
  }))
  return new ValidationError(fields)
}

/** Parses `input` or throws a `ValidationError`; the only way service inputs are validated. */
export function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input)
  if (!result.success) throw toValidationError(result.error)
  return result.data
}
