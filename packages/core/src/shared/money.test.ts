import { describe, expect, it } from 'vitest'
import { applyRate, multiply, percentToBasisPoints, zlotyToGrosze } from './money.ts'

describe('money', () => {
  it('computes the forecast commission from the MVP happy path (5 % × 23 140 zł = 1 157 zł)', () => {
    const quoteValue = multiply(zlotyToGrosze(890), 26)
    expect(quoteValue).toBe(2_314_000)
    expect(applyRate(quoteValue, percentToBasisPoints(5))).toBe(115_700)
  })

  it('computes the due commission from the final value (5 % × 24 030 zł = 1 201,50 zł)', () => {
    expect(applyRate(zlotyToGrosze(24_030), 500)).toBe(120_150)
  })

  it('rounds half up to a whole grosz, once', () => {
    expect(applyRate(1, 3_000)).toBe(0) // 0.3 gr → 0 gr
    expect(applyRate(5, 1_000)).toBe(1) // 0.5 gr → 1 gr
    expect(applyRate(333, 1_250)).toBe(42) // 41.625 gr → 42 gr
  })

  it('avoids float drift when converting złoty', () => {
    expect(zlotyToGrosze(0.1 + 0.2)).toBe(30)
    expect(zlotyToGrosze(19.99)).toBe(1_999)
    expect(() => zlotyToGrosze(1.005)).toThrow(RangeError)
  })

  it('rejects rates outside 0–30 % or not in 0.5 % steps', () => {
    expect(percentToBasisPoints(7.5)).toBe(750)
    expect(() => percentToBasisPoints(30.5)).toThrow(RangeError)
    expect(() => percentToBasisPoints(5.25)).toThrow(RangeError)
  })

  it('rejects negative and fractional amounts', () => {
    expect(() => multiply(-1, 2)).toThrow(RangeError)
    expect(() => multiply(100, 1.5)).toThrow(RangeError)
  })
})
