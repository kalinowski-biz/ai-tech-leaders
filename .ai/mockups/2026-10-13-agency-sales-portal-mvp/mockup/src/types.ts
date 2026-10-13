export type InquiryStatus =
  | 'DRAFT'
  | 'NEW'
  | 'QUOTING'
  | 'QUOTE_READY'
  | 'SENT_TO_CLIENT'
  | 'ACCEPTED'
  | 'BOOKING_CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED_BY_OFFICE'
  | 'REJECTED_BY_CLIENT'
  | 'WITHDRAWN_BY_AGENT';

export type QuoteStatus = 'ACTIVE' | 'SUPERSEDED' | 'INVALIDATED' | 'EXPIRED' | 'ACCEPTED' | 'REJECTED';
export type CommissionStatus = 'FORECAST' | 'DUE' | 'PAID' | 'CANCELLED';
export type AgentStatus = 'INVITED' | 'ACTIVE' | 'DEACTIVATED';
export type OfferStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
export type DecisionChannel = 'link' | 'agent';
export type Role = 'agent' | 'office';

export interface Agent {
  id: string;
  companyName: string;
  nip: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
  commissionRate: number;
  status: AgentStatus;
  invitationToken: string | null;
}

export interface OfficeUser {
  id: string;
  name: string;
  email: string;
}

export interface ProgramDay {
  day: number;
  text: string;
}

export interface PricedService {
  name: string;
  price: number;
}

export interface Offer {
  id: string;
  title: string;
  region: string;
  days: number;
  stages: string[];
  seasonMonths: number[];
  priceFrom: number | null;
  minParticipants: number | null;
  summary: string;
  program: ProgramDay[];
  included: string[];
  extras: PricedService[];
  photoHues: number[];
  pdfName: string | null;
  commissionRate: number | null;
  status: OfferStatus;
  updatedAt: string;
}

export interface Client {
  id: string;
  agentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  school: string;
  city: string;
  note: string;
}

export interface QuoteDecision {
  at: string;
  channel: DecisionChannel;
  accepted: boolean;
  note: string;
}

export interface Quote {
  id: string;
  version: number;
  status: QuoteStatus;
  dateFrom: string;
  dateTo: string;
  pricePerParticipant: number;
  paidParticipants: number;
  freeGuardians: number;
  included: string[];
  optional: PricedService[];
  validUntil: string;
  clientNote: string;
  issuedAt: string;
  issuedBy: string;
  token: string | null;
  sentAt: string | null;
  decision: QuoteDecision | null;
}

export type MessageKind = 'message' | 'change-request' | 'system';

export interface ThreadMessage {
  id: string;
  author: Role;
  authorName: string;
  at: string;
  text: string;
  attachments: string[];
  kind: MessageKind;
}

export interface HistoryEntry {
  at: string;
  actor: string;
  channel: 'portal' | 'link' | 'agent' | 'system';
  label: string;
  comment: string;
}

export interface CommissionHistoryEntry {
  at: string;
  label: string;
}

export interface Commission {
  status: CommissionStatus;
  rate: number;
  baseValue: number;
  amount: number;
  paidOn: string | null;
  history: CommissionHistoryEntry[];
}

export interface OfferSnapshot {
  title: string;
  region: string;
  days: number;
  priceFrom: number | null;
  minParticipants: number | null;
  seasonMonths: number[];
}

export interface Inquiry {
  id: string;
  number: string;
  agentId: string;
  clientId: string;
  offerId: string;
  offerSnapshot: OfferSnapshot;
  status: InquiryStatus;
  quoteExpired: boolean;
  handledBy: string | null;
  dateFrom: string;
  dateTo: string;
  students: number;
  guardians: number;
  ageOrClass: string;
  departureCity: string;
  notes: string;
  createdAt: string;
  submittedAt: string | null;
  statusChangedAt: string;
  confirmedAt: string | null;
  quotes: Quote[];
  messages: ThreadMessage[];
  history: HistoryEntry[];
  unreadForAgent: boolean;
  unreadForOffice: boolean;
  closeReason: string | null;
  contractNumber: string | null;
  completion: { finalValue: number; actualParticipants: number; comment: string } | null;
  commission: Commission | null;
}

export type ScreenMode = 'data' | 'loading' | 'empty' | 'error';

export interface PortalState {
  today: string;
  agents: Agent[];
  officeUsers: OfficeUser[];
  offers: Offer[];
  clients: Client[];
  inquiries: Inquiry[];
  currentAgentId: string;
  currentOfficeUserId: string;
  sequence: number;
}
