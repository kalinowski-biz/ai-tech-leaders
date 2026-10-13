import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMoney,
  formatNip,
  formatPhone,
  formatRate,
  formatRelativeAge,
} from './format'

/** Tests compare with plain spaces; the formatter emits non-breaking ones. */
const plain = (value: string) => value.replace(/\u00A0/g, ' ')

describe('formatters (02-specyfikacja-ekranow.md §1.4)', () => {
  it('formats money', () => {
    expect(plain(formatMoney(2_314_000))).toBe('23 140,00 zł')
    expect(plain(formatMoney(115_700, { compact: true }))).toBe('1 157 zł')
    expect(plain(formatMoney(120_150, { compact: true }))).toBe('1 201,50 zł')
    expect(plain(formatMoney(5))).toBe('0,05 zł')
    expect(plain(formatMoney(123_456_789))).toBe('1 234 567,89 zł')
    expect(plain(formatMoney(-120_150))).toBe('-1 201,50 zł')
    expect(plain(formatMoney(0))).toBe('0,00 zł')
  })

  it('uses non-breaking spaces so amounts never wrap', () => {
    expect(formatMoney(115_700, { compact: true })).toBe('1\u00A0157\u00A0zł')
  })

  it('formats dates and ranges', () => {
    expect(formatDate('2027-05-13')).toBe('13.05.2027')
    expect(formatDateRange('2027-05-13', '2027-05-15')).toBe('13–15.05.2027')
    expect(formatDateRange('2027-04-30', '2027-05-02')).toBe('30.04–02.05.2027')
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30.12.2026–02.01.2027')
  })

  it('rejects dates that are not YYYY-MM-DD', () => {
    expect(() => formatDate('13.05.2027')).toThrow(RangeError)
    expect(() => formatDateRange('2027-05-13', 'tomorrow')).toThrow(RangeError)
  })

  it('formats date-time in Warsaw time', () => {
    expect(formatDateTime('2026-11-02T13:05:00Z')).toBe('02.11.2026, 14:05')
    expect(formatDateTime('2027-05-13T06:00:00Z')).toBe('13.05.2027, 08:00')
    expect(formatDateTime(new Date('2026-12-31T23:30:00Z'))).toBe('01.01.2027, 00:30')
  })

  it('formats the relative age of an inquiry', () => {
    const now = new Date('2026-11-05T12:00:00Z')
    expect(formatRelativeAge('2026-11-05T11:59:30Z', now)).toBe('przed chwilą')
    expect(formatRelativeAge('2026-11-05T11:45:00Z', now)).toBe('15 min temu')
    expect(formatRelativeAge('2026-11-05T10:00:00Z', now)).toBe('2 godz. temu')
    expect(formatRelativeAge('2026-11-04T10:00:00Z', now)).toBe('1 dzień temu')
    expect(formatRelativeAge('2026-11-02T12:00:00Z', now)).toBe('3 dni temu')
  })

  it('formats phone, NIP and commission rate', () => {
    expect(formatPhone('+48601234567')).toBe('+48 601 234 567')
    expect(formatPhone('601234567')).toBe('+48 601 234 567')
    expect(formatPhone('+49 30 1234567')).toBe('+49 30 1234567')
    expect(formatNip('725-123-45-67')).toBe('7251234567')
    expect(formatRate(500)).toBe('5%')
    expect(formatRate(750)).toBe('7,5%')
  })
})
