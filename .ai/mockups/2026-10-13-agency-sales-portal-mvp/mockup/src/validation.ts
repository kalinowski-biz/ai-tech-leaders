export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function isValidPolishPhone(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '').replace(/^\+48/, '');
  return /^\d{9}$/.test(digits);
}

export function isValidNip(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const checksum = weights.reduce((sum, weight, index) => sum + weight * Number(digits[index]), 0) % 11;
  return checksum !== 10 && checksum === Number(digits[9]);
}

export function isStrongPassword(value: string): boolean {
  return value.length >= 10 && /\p{L}/u.test(value) && /\d/.test(value);
}

export function isWholeNumberInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function isRateInRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 30 && Math.round(value * 2) === value * 2;
}
