/** Primary keys are UUIDs; human-readable numbers are for display only. */
export function newId(): string {
  return globalThis.crypto.randomUUID()
}

const INQUIRY_SEQUENCE_DIGITS = 4

/** Display number of an inquiry, e.g. `ZAP-2026-0142`. The sequence comes from a DB-side counter. */
export function formatInquiryNumber(year: number, sequence: number): string {
  return `ZAP-${year}-${String(sequence).padStart(INQUIRY_SEQUENCE_DIGITS, '0')}`
}
