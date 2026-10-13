import type { AgentStatus, CommissionStatus, InquiryStatus, OfferStatus, QuoteStatus } from './types';

const moneyFormatter = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const wholeMoneyFormatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0, useGrouping: 'always' });

export function formatMoney(amount: number): string {
  return `${moneyFormatter.format(amount)} zł`;
}

export function formatWholeMoney(amount: number): string {
  return `${wholeMoneyFormatter.format(amount)} zł`;
}

export function formatRate(rate: number): string {
  return `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(rate)}%`;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}.${month}`;
}

export function formatDateTime(isoDateTime: string): string {
  return `${formatDate(isoDateTime)}, ${isoDateTime.slice(11, 16)}`;
}

export function formatDateRange(dateFrom: string, dateTo: string): string {
  if (dateFrom.slice(0, 7) === dateTo.slice(0, 7)) {
    return `${dateFrom.slice(8, 10)}–${formatDate(dateTo)}`;
  }
  return `${formatShortDate(dateFrom)}–${formatDate(dateTo)}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate.slice(0, 10)}T12:00:00Z`);
  const to = Date.parse(`${toIsoDate.slice(0, 10)}T12:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export function formatAgeInDays(days: number): string {
  if (days <= 0) return 'dziś';
  if (days === 1) return '1 dzień';
  return `${days} dni`;
}

export function pluralizeParticipants(count: number): string {
  return count === 1 ? '1 uczestnik' : `${count} uczestników`;
}

export function pluralizeDays(count: number): string {
  return count === 1 ? '1 dzień' : `${count} dni`;
}

export const monthShortNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  DRAFT: 'Szkic',
  NEW: 'Nowe',
  QUOTING: 'W wycenie',
  QUOTE_READY: 'Wycena gotowa',
  SENT_TO_CLIENT: 'Wysłana do klienta',
  ACCEPTED: 'Zaakceptowana',
  BOOKING_CONFIRMED: 'Rezerwacja potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
  REJECTED_BY_OFFICE: 'Odrzucona (biuro)',
  REJECTED_BY_CLIENT: 'Odrzucona (klient)',
  WITHDRAWN_BY_AGENT: 'Wycofana (agent)',
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  ACTIVE: 'Aktywna',
  SUPERSEDED: 'Zastąpiona',
  INVALIDATED: 'Unieważniona',
  EXPIRED: 'Wygasła',
  ACCEPTED: 'Zaakceptowana',
  REJECTED: 'Odrzucona',
};

export const commissionStatusLabels: Record<CommissionStatus, string> = {
  FORECAST: 'Prognozowana',
  DUE: 'Należna',
  PAID: 'Wypłacona',
  CANCELLED: 'Anulowana',
};

export const agentStatusLabels: Record<AgentStatus, string> = {
  INVITED: 'Zaproszony',
  ACTIVE: 'Aktywny',
  DEACTIVATED: 'Dezaktywowany',
};

export const offerStatusLabels: Record<OfferStatus, string> = {
  DRAFT: 'Szkic',
  PUBLISHED: 'Opublikowana',
  WITHDRAWN: 'Wycofana',
};
