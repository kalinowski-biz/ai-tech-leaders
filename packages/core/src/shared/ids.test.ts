import { describe, expect, it } from 'vitest'
import { formatInquiryNumber, newId } from './ids.ts'

describe('ids', () => {
  it('formats inquiry numbers as ZAP-RRRR-NNNN', () => {
    expect(formatInquiryNumber(2026, 142)).toBe('ZAP-2026-0142')
    expect(formatInquiryNumber(2027, 12345)).toBe('ZAP-2027-12345')
  })

  it('generates UUIDs', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
