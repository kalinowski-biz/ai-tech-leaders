import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ValidationError } from './errors.ts'
import { emailSchema, isValidNip, nipSchema, parseInput, phoneSchema } from './validation.ts'

describe('field schemas', () => {
  it('validates the NIP checksum', () => {
    expect(isValidNip('7251234567')).toBe(false)
    expect(isValidNip('5260250274')).toBe(true)
    expect(isValidNip('526025027')).toBe(false)
    expect(isValidNip('52602502a4')).toBe(false)
    expect(nipSchema.parse('526-025-02-74')).toBe('5260250274')
  })

  it('normalizes Polish phone numbers', () => {
    expect(phoneSchema.parse('+48 601 234 567')).toBe('+48601234567')
    expect(phoneSchema.parse('601-234-567')).toBe('+48601234567')
    expect(phoneSchema.safeParse('60123456').success).toBe(false)
  })

  it('lower-cases e-mail addresses', () => {
    expect(emailSchema.parse(' Jan@Kowalski-Wycieczki.PL ')).toBe('jan@kowalski-wycieczki.pl')
  })
})

describe('parseInput', () => {
  const schema = z.object({ nip: nipSchema, contact: z.object({ email: emailSchema }) })

  it('returns parsed output', () => {
    expect(parseInput(schema, { nip: '5260250274', contact: { email: 'A@B.PL' } })).toEqual({
      nip: '5260250274',
      contact: { email: 'a@b.pl' },
    })
  })

  it('throws a ValidationError with [{ field, code }] using our stable codes', () => {
    try {
      parseInput(schema, { nip: '1234567890', contact: { email: 'nope' } })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).fields).toEqual([
        { field: 'nip', code: 'invalid_nip' },
        { field: 'contact.email', code: 'invalid_email' },
      ])
    }
  })

  it('falls back to the zod issue code for built-in checks', () => {
    const result = (() => {
      try {
        return parseInput(z.object({ name: z.string() }), {})
      } catch (error) {
        return error
      }
    })()
    expect((result as ValidationError).fields).toEqual([{ field: 'name', code: 'invalid_type' }])
  })
})
