import { BUSINESS_TIME_ZONE } from '@tripsalesagent/core/shared'

/**
 * Display formats from 02-specyfikacja-ekranow.md §1.4. Implemented by hand
 * (not `Intl`) where ICU's Polish defaults differ from the spec: pl-PL does not
 * group 4-digit numbers ("1157 zł"), the spec wants "1 157 zł".
 */
const NBSP = '\u00A0'

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

/**
 * Money from integer grosze: `23 140,00 zł`. With `compact`, whole amounts drop
 * the grosze (`1 157 zł`) – used in summaries and dashboards.
 */
export function formatMoney(grosze: number, { compact = false } = {}): string {
  const sign = grosze < 0 ? '-' : ''
  const abs = Math.abs(grosze)
  const zloty = groupThousands(String(Math.trunc(abs / 100)))
  const rest = abs % 100
  const fraction = compact && rest === 0 ? '' : `,${String(rest).padStart(2, '0')}`
  return `${sign}${zloty}${fraction}${NBSP}zł`
}

function parseDate(date: string): [year: string, month: string, day: string] {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) throw new RangeError(`Expected YYYY-MM-DD, got "${date}"`)
  return [match[1]!, match[2]!, match[3]!]
}

/** `2027-05-13` → `13.05.2027`. */
export function formatDate(date: string): string {
  const [year, month, day] = parseDate(date)
  return `${day}.${month}.${year}`
}

/** `13–15.05.2027`, `30.04–02.05.2027`, `30.12.2026–02.01.2027`. */
export function formatDateRange(from: string, to: string): string {
  const [fromYear, fromMonth, fromDay] = parseDate(from)
  const [toYear, toMonth] = parseDate(to)
  if (fromYear !== toYear) return `${formatDate(from)}–${formatDate(to)}`
  if (fromMonth !== toMonth) return `${fromDay}.${fromMonth}–${formatDate(to)}`
  return `${fromDay}–${formatDate(to)}`
}

const dateTimeFormat = new Intl.DateTimeFormat('pl-PL', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Instant → `02.11.2026, 14:05` in Warsaw time. */
export function formatDateTime(instant: string | Date): string {
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  )
  return `${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Age of an inquiry: `przed chwilą`, `15 min temu`, `2 godz. temu`, `1 dzień temu`, `3 dni temu`. */
export function formatRelativeAge(instant: string | Date, now: Date): string {
  const elapsed = now.getTime() - new Date(instant).getTime()
  if (elapsed < MINUTE) return 'przed chwilą'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min temu`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} godz. temu`
  const days = Math.floor(elapsed / DAY)
  return days === 1 ? '1 dzień temu' : `${days} dni temu`
}

/** `+48601234567` (normalized by phoneSchema) → `+48 601 234 567`. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^48(?=\d{9}$)/, '')
  if (digits.length !== 9) return phone
  return `+48 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

/** NIP is shown as 10 digits without separators. */
export function formatNip(nip: string): string {
  return nip.replace(/\D/g, '')
}

/** Commission rate from basis points: 500 → `5%`, 750 → `7,5%`. */
export function formatRate(basisPoints: number): string {
  return `${String(basisPoints / 100).replace('.', ',')}%`
}
