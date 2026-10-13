/**
 * Money is stored and computed as integer grosze (1 zł = 100 gr), never as
 * floats. Commission rates are integer basis points (500 bp = 5 %).
 */
export type Grosze = number
export type BasisPoints = number

const BASIS_POINTS_PER_UNIT = 10_000
/** Commission rate limits from the agent/offer form: 0–30 % in 0.5 % steps. */
export const COMMISSION_RATE_MAX_BP = 3_000
export const COMMISSION_RATE_STEP_BP = 50

function assertGrosze(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer amount of grosze, got ${value}`)
  }
}

/** Converts a złoty amount with at most two decimals (as entered in a form) to grosze. */
export function zlotyToGrosze(zloty: number): Grosze {
  const grosze = Math.round(zloty * 100)
  if (Math.abs(grosze - zloty * 100) > 1e-6) {
    throw new RangeError(`Amount ${zloty} has more than two decimal places`)
  }
  assertGrosze(grosze, 'Amount')
  return grosze
}

/** Unit price × quantity, e.g. quote value = price per participant × paid participants. */
export function multiply(unitPrice: Grosze, quantity: number): Grosze {
  assertGrosze(unitPrice, 'Unit price')
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a non-negative integer, got ${quantity}`)
  }
  const total = unitPrice * quantity
  assertGrosze(total, 'Total')
  return total
}

/**
 * Applies a rate to an amount, rounding half up to a whole grosz. This is the
 * only place where commission rounding happens, and it happens once.
 */
export function applyRate(amount: Grosze, rate: BasisPoints): Grosze {
  assertGrosze(amount, 'Amount')
  assertRate(rate)
  return Math.floor((amount * rate + BASIS_POINTS_PER_UNIT / 2) / BASIS_POINTS_PER_UNIT)
}

export function percentToBasisPoints(percent: number): BasisPoints {
  const rate = Math.round(percent * 100)
  assertRate(rate)
  return rate
}

export function isValidCommissionRate(rate: BasisPoints): boolean {
  return (
    Number.isInteger(rate) &&
    rate >= 0 &&
    rate <= COMMISSION_RATE_MAX_BP &&
    rate % COMMISSION_RATE_STEP_BP === 0
  )
}

function assertRate(rate: BasisPoints): void {
  if (!isValidCommissionRate(rate)) {
    throw new RangeError(`Commission rate must be 0–30 % in 0.5 % steps, got ${rate} bp`)
  }
}
