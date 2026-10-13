import { addDays, daysBetween, formatDate, formatMoney } from './format';
import { createSeedState } from './seed';
import type {
  Agent,
  Client,
  Commission,
  HistoryEntry,
  Inquiry,
  InquiryStatus,
  Offer,
  PortalState,
  PricedService,
  Quote,
  Role,
  ThreadMessage,
} from './types';

const storageKey = 'agency-sales-portal-mvp-prototype-v1';

function loadPersistedState(): PortalState | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const persisted: PortalState = JSON.parse(raw);
    return persisted;
  } catch {
    return null;
  }
}

export let state: PortalState = loadPersistedState() ?? createSeedState();

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): void {
  listeners.add(listener);
}

export function commit(): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // prototype keeps working without persistence
  }
  listeners.forEach((listener) => listener());
}

export function resetState(): void {
  state = createSeedState();
  commit();
}

export const terminalStatuses: InquiryStatus[] = ['COMPLETED', 'CANCELLED', 'REJECTED_BY_OFFICE', 'REJECTED_BY_CLIENT', 'WITHDRAWN_BY_AGENT'];
export const funnelStatuses: InquiryStatus[] = ['NEW', 'QUOTING', 'QUOTE_READY', 'SENT_TO_CLIENT', 'ACCEPTED', 'BOOKING_CONFIRMED'];

export function nowTimestamp(): string {
  const clock = new Date();
  const time = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}:00`;
  return `${state.today}T${time}`;
}

export function nextId(prefix: string): string {
  state.sequence += 1;
  return `${prefix}-${state.sequence}-${Math.random().toString(36).slice(2, 6)}`;
}

export function currentAgent(): Agent {
  return findAgent(state.currentAgentId);
}

export function currentOfficeUserName(): string {
  return state.officeUsers.find((user) => user.id === state.currentOfficeUserId)?.name ?? 'Pracownik biura';
}

export function findAgent(agentId: string): Agent {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  if (!agent) throw new Error(`Brak agenta ${agentId}`);
  return agent;
}

export function findOffer(offerId: string): Offer | undefined {
  return state.offers.find((offer) => offer.id === offerId);
}

export function findClient(clientId: string): Client | undefined {
  return state.clients.find((client) => client.id === clientId);
}

export function findInquiry(inquiryId: string): Inquiry | undefined {
  return state.inquiries.find((inquiry) => inquiry.id === inquiryId);
}

export function agentFullName(agent: Agent): string {
  return `${agent.firstName} ${agent.lastName}`;
}

export function clientFullName(client: Client | undefined): string {
  return client ? `${client.firstName} ${client.lastName}` : 'Klient usunięty';
}

export function activeQuote(inquiry: Inquiry): Quote | undefined {
  return inquiry.quotes.find((quote) => quote.status === 'ACTIVE');
}

export function acceptedQuote(inquiry: Inquiry): Quote | undefined {
  return inquiry.quotes.find((quote) => quote.status === 'ACCEPTED');
}

export function latestQuote(inquiry: Inquiry): Quote | undefined {
  return [...inquiry.quotes].sort((left, right) => right.version - left.version)[0];
}

export function quoteValue(quote: Pick<Quote, 'pricePerParticipant' | 'paidParticipants'>): number {
  return quote.pricePerParticipant * quote.paidParticipants;
}

export function inquiryValue(inquiry: Inquiry): { value: number; estimated: boolean } {
  if (inquiry.completion) return { value: inquiry.completion.finalValue, estimated: false };
  const decisive = acceptedQuote(inquiry) ?? activeQuote(inquiry) ?? latestQuote(inquiry);
  if (decisive) return { value: quoteValue(decisive), estimated: false };
  return { value: (inquiry.offerSnapshot.priceFrom ?? 0) * inquiry.students, estimated: true };
}

export function effectiveCommissionRate(inquiry: Inquiry): number {
  const offer = findOffer(inquiry.offerId);
  return offer?.commissionRate ?? findAgent(inquiry.agentId).commissionRate;
}

export function commissionAmount(baseValue: number, rate: number): number {
  return Math.round(baseValue * rate) / 100;
}

export function isTerminal(inquiry: Inquiry): boolean {
  return terminalStatuses.includes(inquiry.status);
}

export function isSettlementDue(inquiry: Inquiry): boolean {
  return inquiry.status === 'BOOKING_CONFIRMED' && inquiry.dateTo < state.today;
}

export function inquiriesOfAgent(agentId: string): Inquiry[] {
  return state.inquiries.filter((inquiry) => inquiry.agentId === agentId);
}

export function inquiriesOfClient(clientId: string): Inquiry[] {
  return state.inquiries.filter((inquiry) => inquiry.clientId === clientId && inquiry.status !== 'DRAFT');
}

function record(inquiry: Inquiry, actor: string, channel: HistoryEntry['channel'], label: string, comment = ''): void {
  inquiry.history.push({ at: nowTimestamp(), actor, channel, label, comment });
}

function moveTo(inquiry: Inquiry, status: InquiryStatus, notify: Role | 'both'): void {
  inquiry.status = status;
  inquiry.statusChangedAt = nowTimestamp();
  if (notify === 'agent' || notify === 'both') inquiry.unreadForAgent = true;
  if (notify === 'office' || notify === 'both') inquiry.unreadForOffice = true;
}

function cancelCommission(inquiry: Inquiry, label: string): void {
  if (!inquiry.commission || inquiry.commission.status === 'PAID') return;
  inquiry.commission.status = 'CANCELLED';
  inquiry.commission.amount = 0;
  inquiry.commission.history.push({ at: nowTimestamp(), label });
}

function invalidateActiveQuote(inquiry: Inquiry): void {
  const quote = activeQuote(inquiry);
  if (quote) quote.status = 'INVALIDATED';
}

function generateToken(inquiry: Inquiry, version: number): string {
  return `${inquiry.number.slice(-4)}-v${version}-${Math.random().toString(36).slice(2, 8)}`;
}

export function applySystemClock(): void {
  state.inquiries.forEach((inquiry) => {
    const quote = activeQuote(inquiry);
    if (!quote || quote.validUntil >= state.today) return;
    if (inquiry.status !== 'QUOTE_READY' && inquiry.status !== 'SENT_TO_CLIENT') return;
    quote.status = 'EXPIRED';
    inquiry.quoteExpired = true;
    moveTo(inquiry, 'QUOTE_READY', 'both');
    inquiry.history.push({ at: `${addDays(quote.validUntil, 1)}T00:05:00`, actor: 'System', channel: 'system', label: `Wycena v${quote.version} wygasła`, comment: '' });
  });
}

export function shiftClock(days: number): void {
  state.today = addDays(state.today, days);
  applySystemClock();
  commit();
}

export function setClock(isoDate: string): void {
  state.today = isoDate;
  applySystemClock();
  commit();
}

export interface InquiryDraftInput {
  clientId: string;
  offerId: string;
  dateFrom: string;
  dateTo: string;
  students: number;
  guardians: number;
  ageOrClass: string;
  departureCity: string;
  notes: string;
}

export function saveInquiry(input: InquiryDraftInput, submit: boolean, existingDraftId: string | null): Inquiry {
  const offer = findOffer(input.offerId);
  if (!offer) throw new Error('Oferta nie istnieje');
  const agent = currentAgent();
  const existing = existingDraftId ? findInquiry(existingDraftId) : undefined;
  const timestamp = nowTimestamp();
  const inquiry: Inquiry = existing ?? {
    id: nextId('inq'),
    number: `ZAP-2026-${String(state.sequence).padStart(4, '0')}`,
    agentId: agent.id,
    clientId: input.clientId,
    offerId: offer.id,
    offerSnapshot: { title: offer.title, region: offer.region, days: offer.days, priceFrom: offer.priceFrom, minParticipants: offer.minParticipants, seasonMonths: [...offer.seasonMonths] },
    status: 'DRAFT',
    quoteExpired: false,
    handledBy: null,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    students: input.students,
    guardians: input.guardians,
    ageOrClass: input.ageOrClass,
    departureCity: input.departureCity,
    notes: input.notes,
    createdAt: timestamp,
    submittedAt: null,
    statusChangedAt: timestamp,
    confirmedAt: null,
    quotes: [],
    messages: [],
    history: [],
    unreadForAgent: false,
    unreadForOffice: false,
    closeReason: null,
    contractNumber: null,
    completion: null,
    commission: null,
  };
  Object.assign(inquiry, input);
  if (!existing) state.inquiries.unshift(inquiry);
  if (submit) {
    inquiry.offerSnapshot = { title: offer.title, region: offer.region, days: offer.days, priceFrom: offer.priceFrom, minParticipants: offer.minParticipants, seasonMonths: [...offer.seasonMonths] };
    inquiry.submittedAt = timestamp;
    moveTo(inquiry, 'NEW', 'office');
    record(inquiry, agentFullName(agent), 'portal', 'Złożono zapytanie');
  }
  commit();
  return inquiry;
}

export function takeOverInquiry(inquiry: Inquiry): void {
  inquiry.handledBy = currentOfficeUserName();
  moveTo(inquiry, 'QUOTING', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', 'Przejęto do wyceny');
  commit();
}

export function reassignHandler(inquiry: Inquiry): void {
  inquiry.handledBy = currentOfficeUserName();
  record(inquiry, currentOfficeUserName(), 'portal', 'Przejęto obsługę zapytania');
  commit();
}

export function rejectByOffice(inquiry: Inquiry, reason: string): void {
  invalidateActiveQuote(inquiry);
  cancelCommission(inquiry, 'Anulowana: zapytanie odrzucone przez biuro');
  inquiry.closeReason = reason;
  moveTo(inquiry, 'REJECTED_BY_OFFICE', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', 'Odrzucono zapytanie', reason);
  commit();
}

export interface QuoteInput {
  dateFrom: string;
  dateTo: string;
  pricePerParticipant: number;
  paidParticipants: number;
  freeGuardians: number;
  included: string[];
  optional: PricedService[];
  validUntil: string;
  clientNote: string;
}

export function issueQuote(inquiry: Inquiry, input: QuoteInput): Quote {
  const previous = activeQuote(inquiry);
  if (previous) previous.status = 'SUPERSEDED';
  const version = (latestQuote(inquiry)?.version ?? 0) + 1;
  const quote: Quote = { id: nextId('q'), version, status: 'ACTIVE', ...input, issuedAt: nowTimestamp(), issuedBy: currentOfficeUserName(), token: null, sentAt: null, decision: null };
  inquiry.quotes.push(quote);
  inquiry.quoteExpired = false;
  inquiry.handledBy ??= currentOfficeUserName();
  moveTo(inquiry, 'QUOTE_READY', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', `Wystawiono wycenę v${version}`, formatMoney(quoteValue(quote)));
  commit();
  return quote;
}

export function sendQuoteToClient(inquiry: Inquiry): string {
  const quote = activeQuote(inquiry);
  if (!quote) throw new Error('Brak aktywnej wyceny');
  quote.token = generateToken(inquiry, quote.version);
  quote.sentAt = nowTimestamp();
  moveTo(inquiry, 'SENT_TO_CLIENT', 'office');
  inquiry.unreadForOffice = false;
  record(inquiry, agentFullName(findAgent(inquiry.agentId)), 'portal', `Wysłano link do wyceny v${quote.version}`);
  commit();
  return quote.token;
}

export function requestChange(inquiry: Inquiry, description: string): void {
  invalidateActiveQuote(inquiry);
  inquiry.quoteExpired = false;
  const agent = findAgent(inquiry.agentId);
  inquiry.messages.push({ id: nextId('m'), author: 'agent', authorName: agentFullName(agent), at: nowTimestamp(), text: description, attachments: [], kind: 'change-request' });
  moveTo(inquiry, 'QUOTING', 'office');
  record(inquiry, agentFullName(agent), 'portal', 'Prośba o zmianę wyceny', description);
  commit();
}

export function recordClientDecision(inquiry: Inquiry, accepted: boolean, channel: 'link' | 'agent', note: string): void {
  const quote = activeQuote(inquiry);
  if (!quote) throw new Error('Brak aktywnej wyceny');
  quote.status = accepted ? 'ACCEPTED' : 'REJECTED';
  quote.decision = { at: nowTimestamp(), channel, accepted, note };
  const actor = channel === 'link' ? 'Klient' : agentFullName(findAgent(inquiry.agentId));
  if (accepted) {
    const rate = effectiveCommissionRate(inquiry);
    const baseValue = quoteValue(quote);
    inquiry.commission = { status: 'FORECAST', rate, baseValue, amount: commissionAmount(baseValue, rate), paidOn: null, history: [{ at: nowTimestamp(), label: `Prognozowana, stawka ${rate}% zamrożona` }] };
    moveTo(inquiry, 'ACCEPTED', channel === 'link' ? 'both' : 'office');
    record(inquiry, actor, channel, `Klient zaakceptował wycenę v${quote.version}`, note);
  } else {
    inquiry.closeReason = note || null;
    moveTo(inquiry, 'REJECTED_BY_CLIENT', channel === 'link' ? 'both' : 'office');
    record(inquiry, actor, channel, `Klient odrzucił wycenę v${quote.version}`, note);
  }
  commit();
}

export function withdrawByAgent(inquiry: Inquiry, reason: string): void {
  invalidateActiveQuote(inquiry);
  cancelCommission(inquiry, 'Anulowana: zapytanie wycofane przez agenta');
  inquiry.closeReason = reason;
  moveTo(inquiry, 'WITHDRAWN_BY_AGENT', 'office');
  record(inquiry, agentFullName(findAgent(inquiry.agentId)), 'portal', 'Wycofano zapytanie', reason);
  commit();
}

export function confirmBooking(inquiry: Inquiry, contractNumber: string): void {
  inquiry.contractNumber = contractNumber;
  inquiry.confirmedAt = nowTimestamp();
  moveTo(inquiry, 'BOOKING_CONFIRMED', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', 'Potwierdzono rezerwację', `Umowa ${contractNumber}`);
  commit();
}

export function reopenForRequote(inquiry: Inquiry, message: string): void {
  const quote = acceptedQuote(inquiry);
  if (quote) quote.status = 'SUPERSEDED';
  cancelCommission(inquiry, 'Anulowana: zmiana warunków, powstanie przy ponownej akceptacji');
  inquiry.messages.push({ id: nextId('m'), author: 'office', authorName: currentOfficeUserName(), at: nowTimestamp(), text: message, attachments: [], kind: 'message' });
  moveTo(inquiry, 'QUOTING', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', 'Zmiana warunków – powrót do wyceny', message);
  commit();
}

export function completeBooking(inquiry: Inquiry, finalValue: number, actualParticipants: number, comment: string): void {
  inquiry.completion = { finalValue, actualParticipants, comment };
  const commission: Commission = inquiry.commission ?? { status: 'FORECAST', rate: effectiveCommissionRate(inquiry), baseValue: finalValue, amount: 0, paidOn: null, history: [] };
  commission.status = 'DUE';
  commission.baseValue = finalValue;
  commission.amount = commissionAmount(finalValue, commission.rate);
  commission.history.push({ at: nowTimestamp(), label: `Należna: ${formatMoney(finalValue)} × ${commission.rate}%` });
  inquiry.commission = commission;
  moveTo(inquiry, 'COMPLETED', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', 'Oznaczono jako zrealizowaną', `Wartość końcowa ${formatMoney(finalValue)}, uczestników: ${actualParticipants}${comment ? `. ${comment}` : ''}`);
  commit();
}

export function cancelBooking(inquiry: Inquiry, reason: string): void {
  cancelCommission(inquiry, 'Anulowana: rezerwacja anulowana');
  inquiry.closeReason = reason;
  moveTo(inquiry, 'CANCELLED', 'agent');
  record(inquiry, currentOfficeUserName(), 'portal', 'Anulowano rezerwację', reason);
  commit();
}

export function postMessage(inquiry: Inquiry, author: Role, text: string, attachments: string[]): void {
  const authorName = author === 'agent' ? agentFullName(findAgent(inquiry.agentId)) : currentOfficeUserName();
  const message: ThreadMessage = { id: nextId('m'), author, authorName, at: nowTimestamp(), text, attachments, kind: 'message' };
  inquiry.messages.push(message);
  if (author === 'agent') inquiry.unreadForOffice = true;
  else inquiry.unreadForAgent = true;
  commit();
}

export function markReadBy(inquiry: Inquiry, role: Role): void {
  const flag = role === 'agent' ? 'unreadForAgent' : 'unreadForOffice';
  if (!inquiry[flag]) return;
  inquiry[flag] = false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // prototype keeps working without persistence
  }
}

export function markCommissionsPaid(inquiryIds: string[], paidOn: string): void {
  inquiryIds.forEach((inquiryId) => {
    const inquiry = findInquiry(inquiryId);
    if (!inquiry?.commission || inquiry.commission.status !== 'DUE') return;
    inquiry.commission.status = 'PAID';
    inquiry.commission.paidOn = paidOn;
    inquiry.commission.history.push({ at: nowTimestamp(), label: `Wypłacona ${formatDate(paidOn)} (${currentOfficeUserName()})` });
    inquiry.unreadForAgent = true;
  });
  commit();
}

export function revertCommissionPayment(inquiryId: string, reason: string): void {
  const inquiry = findInquiry(inquiryId);
  if (!inquiry?.commission || inquiry.commission.status !== 'PAID') return;
  inquiry.commission.status = 'DUE';
  inquiry.commission.paidOn = null;
  inquiry.commission.history.push({ at: nowTimestamp(), label: `Cofnięto wypłatę (${currentOfficeUserName()}): ${reason}` });
  commit();
}

export type ClientInput = Omit<Client, 'id' | 'agentId'>;

export function saveClient(input: ClientInput, clientId: string | null): Client {
  const existing = clientId ? findClient(clientId) : undefined;
  if (existing) {
    Object.assign(existing, input);
    commit();
    return existing;
  }
  const client: Client = { id: nextId('cl'), agentId: state.currentAgentId, ...input };
  state.clients.unshift(client);
  commit();
  return client;
}

export function deleteClient(clientId: string): void {
  state.clients = state.clients.filter((client) => client.id !== clientId);
  commit();
}

export type OfferInput = Omit<Offer, 'id' | 'status' | 'updatedAt'>;

export function missingFieldsForPublication(offer: OfferInput): string[] {
  const missing: string[] = [];
  if (!offer.title.trim()) missing.push('tytuł');
  if (!offer.region) missing.push('region');
  if (!offer.days || offer.days < 1) missing.push('liczba dni');
  if (offer.stages.length === 0) missing.push('etap edukacji');
  if (offer.seasonMonths.length === 0) missing.push('sezon dostępności');
  if (!offer.priceFrom) missing.push('cena „od”');
  if (!offer.minParticipants) missing.push('minimalna liczba uczestników');
  if (!offer.summary.trim()) missing.push('opis skrócony');
  if (offer.program.filter((day) => day.text.trim()).length < offer.days) missing.push(`program na każdy z ${offer.days} dni`);
  if (offer.included.length === 0) missing.push('świadczenia w cenie');
  if (offer.photoHues.length === 0) missing.push('co najmniej jedno zdjęcie');
  return missing;
}

export function saveOffer(input: OfferInput, offerId: string | null): Offer {
  const existing = offerId ? findOffer(offerId) : undefined;
  if (existing) {
    Object.assign(existing, input, { updatedAt: nowTimestamp() });
    commit();
    return existing;
  }
  const offer: Offer = { id: nextId('off'), status: 'DRAFT', updatedAt: nowTimestamp(), ...input };
  state.offers.unshift(offer);
  commit();
  return offer;
}

export function setOfferStatus(offer: Offer, status: Offer['status']): void {
  offer.status = status;
  offer.updatedAt = nowTimestamp();
  commit();
}

export function duplicateOffer(offer: Offer): Offer {
  const copy: Offer = { ...structuredClone(offer), id: nextId('off'), title: `${offer.title} (kopia)`, status: 'DRAFT', updatedAt: nowTimestamp() };
  state.offers.unshift(copy);
  commit();
  return copy;
}

export type AgentInput = Omit<Agent, 'id' | 'status' | 'invitationToken'>;

export function findAgentConflict(input: Pick<AgentInput, 'email' | 'nip'>, agentId: string | null): 'email' | 'nip' | null {
  const others = state.agents.filter((agent) => agent.id !== agentId);
  if (others.some((agent) => agent.email.toLowerCase() === input.email.toLowerCase())) return 'email';
  if (others.some((agent) => agent.nip === input.nip)) return 'nip';
  return null;
}

export function saveAgent(input: AgentInput, agentId: string | null): Agent {
  const existing = agentId ? state.agents.find((agent) => agent.id === agentId) : undefined;
  if (existing) {
    Object.assign(existing, input);
    commit();
    return existing;
  }
  const agent: Agent = { id: nextId('ag'), status: 'INVITED', invitationToken: `akt-${Math.random().toString(36).slice(2, 8)}`, ...input };
  state.agents.push(agent);
  commit();
  return agent;
}

export function resendInvitation(agent: Agent): void {
  agent.invitationToken = `akt-${Math.random().toString(36).slice(2, 8)}`;
  commit();
}

export function deactivateAgent(agent: Agent): void {
  agent.status = 'DEACTIVATED';
  agent.invitationToken = null;
  commit();
}

export function activateAgent(token: string): Agent | undefined {
  const agent = state.agents.find((candidate) => candidate.invitationToken === token && candidate.status === 'INVITED');
  if (!agent) return undefined;
  agent.status = 'ACTIVE';
  agent.invitationToken = null;
  state.currentAgentId = agent.id;
  commit();
  return agent;
}

export function findQuoteByToken(token: string): { inquiry: Inquiry; quote: Quote } | undefined {
  for (const inquiry of state.inquiries) {
    const quote = inquiry.quotes.find((candidate) => candidate.token === token);
    if (quote) return { inquiry, quote };
  }
  return undefined;
}

export interface ActionItem {
  inquiry: Inquiry;
  reason: string;
  tone: 'marker' | 'alert';
}

export function agentActionItems(agentId: string): ActionItem[] {
  const items: ActionItem[] = [];
  inquiriesOfAgent(agentId).forEach((inquiry) => {
    const quote = activeQuote(inquiry);
    const lastOfficeMessage = [...inquiry.messages].reverse().find((message) => message.author === 'office');
    if (inquiry.quoteExpired && inquiry.status === 'QUOTE_READY') items.push({ inquiry, reason: 'Wycena wygasła – poproś o odświeżenie albo zamknij', tone: 'alert' });
    if (inquiry.status === 'QUOTE_READY' && quote) items.push({ inquiry, reason: `Wycena v${quote.version} gotowa do wysłania`, tone: 'marker' });
    if (quote && (inquiry.status === 'QUOTE_READY' || inquiry.status === 'SENT_TO_CLIENT')) {
      const daysLeft = daysBetween(state.today, quote.validUntil);
      if (daysLeft <= 3) items.push({ inquiry, reason: daysLeft <= 0 ? 'Wycena wygasa dziś' : `Wycena wygasa za ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'} (${formatDate(quote.validUntil)})`, tone: 'alert' });
    }
    if (inquiry.status === 'SENT_TO_CLIENT' && quote?.sentAt) {
      const waitingDays = daysBetween(quote.sentAt, state.today);
      if (waitingDays > 7) items.push({ inquiry, reason: `Klient bez decyzji od ${waitingDays} dni`, tone: 'marker' });
    }
    if (inquiry.unreadForAgent && lastOfficeMessage && inquiry.status === 'QUOTING' && !inquiry.quotes.some((candidate) => candidate.issuedAt > lastOfficeMessage.at)) {
      items.push({ inquiry, reason: 'Pytanie biura w wątku', tone: 'marker' });
    } else if (inquiry.unreadForAgent && lastOfficeMessage && !items.some((item) => item.inquiry === inquiry)) {
      items.push({ inquiry, reason: 'Nowa wiadomość od biura', tone: 'marker' });
    }
    if (inquiry.unreadForAgent && !items.some((item) => item.inquiry === inquiry) && ['REJECTED_BY_OFFICE', 'BOOKING_CONFIRMED', 'CANCELLED', 'QUOTING', 'COMPLETED'].includes(inquiry.status)) {
      items.push({ inquiry, reason: 'Zmiana statusu po stronie biura', tone: 'marker' });
    }
  });
  return items;
}

export function officeCounters(): { queue: number; settlement: number; commissionsDue: number } {
  return {
    queue: state.inquiries.filter((inquiry) => inquiry.status === 'NEW' || (inquiry.unreadForOffice && inquiry.status !== 'DRAFT')).length,
    settlement: state.inquiries.filter(isSettlementDue).length,
    commissionsDue: state.inquiries.filter((inquiry) => inquiry.commission?.status === 'DUE').length,
  };
}

export function agentCounters(agentId: string): { actionItems: number; unreadInquiries: number } {
  return {
    actionItems: new Set(agentActionItems(agentId).map((item) => item.inquiry.id)).size,
    unreadInquiries: inquiriesOfAgent(agentId).filter((inquiry) => inquiry.unreadForAgent).length,
  };
}
