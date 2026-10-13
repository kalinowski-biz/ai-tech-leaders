/**
 * Port: the source of "now". Domain code never calls `new Date()` / `Date.now()`
 * directly, so time-dependent rules (quote expiry, settlement due) are testable.
 */
export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  now: () => new Date(),
}

/** Test double: a clock that only moves when told to. */
export class FixedClock implements Clock {
  private current: Date

  constructor(start: Date | string) {
    this.current = new Date(start)
  }

  now(): Date {
    return new Date(this.current)
  }

  set(instant: Date | string): void {
    this.current = new Date(instant)
  }

  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * MS_PER_DAY)
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Business days (quote validity, departure, return) are calendar days in the office's time zone. */
export const BUSINESS_TIME_ZONE = 'Europe/Warsaw'

/** A calendar date as `YYYY-MM-DD` (stored in PostgreSQL as `date`). */
export type BusinessDate = string

const businessDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The calendar date of `instant` in the business time zone. */
export function toBusinessDate(instant: Date): BusinessDate {
  return businessDateFormat.format(instant)
}

/**
 * True once the whole business day `date` has passed, e.g. a quote valid until
 * `2026-11-20` is still valid at 23:59 Warsaw time that day and expired at 00:00.
 */
export function isBusinessDatePast(date: BusinessDate, now: Date): boolean {
  return toBusinessDate(now) > date
}

/** Whole calendar days from today (business time zone) to `date`; negative when past. */
export function businessDaysUntil(date: BusinessDate, now: Date): number {
  const today = Date.parse(`${toBusinessDate(now)}T00:00:00Z`)
  return Math.round((Date.parse(`${date}T00:00:00Z`) - today) / MS_PER_DAY)
}
