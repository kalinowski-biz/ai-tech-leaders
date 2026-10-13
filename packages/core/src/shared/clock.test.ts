import { describe, expect, it } from 'vitest'
import { businessDaysUntil, FixedClock, isBusinessDatePast, systemClock, toBusinessDate } from './clock.ts'

describe('clocks', () => {
  it('systemClock returns the current instant', () => {
    const before = Date.now()
    const now = systemClock.now().getTime()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThanOrEqual(Date.now())
  })

  it('FixedClock hands out copies, so callers cannot move it', () => {
    const clock = new FixedClock(new Date('2026-10-13T08:00:00Z'))
    clock.now().setFullYear(2000)
    expect(clock.now().toISOString()).toBe('2026-10-13T08:00:00.000Z')
  })
})

describe('business dates (Europe/Warsaw)', () => {
  it('uses the Warsaw calendar day, not UTC', () => {
    expect(toBusinessDate(new Date('2026-11-20T22:59:00Z'))).toBe('2026-11-20') // 23:59 CET
    expect(toBusinessDate(new Date('2026-11-20T23:00:00Z'))).toBe('2026-11-21') // 00:00 CET
    expect(toBusinessDate(new Date('2027-05-13T21:59:00Z'))).toBe('2027-05-13') // 23:59 CEST
  })

  it('treats a quote as valid through the whole last day', () => {
    const clock = new FixedClock('2026-11-20T22:59:00Z')
    expect(isBusinessDatePast('2026-11-20', clock.now())).toBe(false)
    clock.set('2026-11-20T23:00:00Z')
    expect(isBusinessDatePast('2026-11-20', clock.now())).toBe(true)
  })

  it('counts whole days to a date for the "expires within 3 days" warning', () => {
    const clock = new FixedClock('2026-11-17T10:00:00Z')
    expect(businessDaysUntil('2026-11-20', clock.now())).toBe(3)
    clock.advanceDays(4)
    expect(businessDaysUntil('2026-11-20', clock.now())).toBe(-1)
  })

  it('counts across a DST change without drifting', () => {
    expect(businessDaysUntil('2027-03-29', new Date('2027-03-27T12:00:00Z'))).toBe(2)
  })
})
