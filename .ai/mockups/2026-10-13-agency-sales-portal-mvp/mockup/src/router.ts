import type { Location } from './navigation';
import { agentClientDetailScreen, agentClientListScreen } from './screens/agent-clients';
import { agentCommissionsScreen } from './screens/agent-commissions';
import { agentDashboardScreen } from './screens/agent-dashboard';
import { agentInquiryDetailScreen, agentInquiryListScreen } from './screens/agent-inquiries';
import { agentInquiryFormScreen } from './screens/agent-inquiry-form';
import { agentOfferDetailScreen, agentOfferSearchScreen } from './screens/agent-offers';
import { activationScreen, loginScreen, passwordResetRequestScreen, passwordResetScreen } from './screens/auth';
import { officeAgentFormScreen, officeAgentListScreen } from './screens/office-agents';
import { officeCommissionsScreen } from './screens/office-commissions';
import { officeInquiryDetailScreen } from './screens/office-inquiry';
import { officeOfferEditorScreen, officeOfferListScreen, officeOfferPreviewScreen } from './screens/office-offers';
import { officeQueueScreen, officeSettlementScreen } from './screens/office-queue';
import { officeReportScreen } from './screens/office-report';
import { prototypeIndexScreen } from './screens/prototype-index';
import { publicQuoteScreen } from './screens/public-quote';
import type { ScreenDefinition } from './ui';

export type Zone = 'index' | 'auth' | 'agent' | 'office' | 'public';

export interface ResolvedRoute {
  zone: Zone;
  navKey: string;
  build: () => ScreenDefinition;
}

type Segments = string[];

const agentRoutes: Array<[(segments: Segments) => boolean, string, (segments: Segments) => ScreenDefinition]> = [
  [(s) => s[1] === 'panel', 'panel', () => agentDashboardScreen()],
  [(s) => s[1] === 'oferty' && s.length === 2, 'oferty', () => agentOfferSearchScreen()],
  [(s) => s[1] === 'oferty' && s.length === 3, 'oferty', (s) => agentOfferDetailScreen(s[2] ?? '')],
  [(s) => s[1] === 'zapytania' && s[2] === 'nowe', 'zapytania', () => agentInquiryFormScreen(null)],
  [(s) => s[1] === 'zapytania' && s[3] === 'edycja', 'zapytania', (s) => agentInquiryFormScreen(s[2] ?? '')],
  [(s) => s[1] === 'zapytania' && s.length === 3, 'zapytania', (s) => agentInquiryDetailScreen(s[2] ?? '')],
  [(s) => s[1] === 'zapytania', 'zapytania', () => agentInquiryListScreen()],
  [(s) => s[1] === 'klienci' && s.length === 3, 'klienci', (s) => agentClientDetailScreen(s[2] ?? '')],
  [(s) => s[1] === 'klienci', 'klienci', () => agentClientListScreen()],
  [(s) => s[1] === 'prowizje', 'prowizje', () => agentCommissionsScreen()],
];

const officeRoutes: Array<[(segments: Segments) => boolean, string, (segments: Segments) => ScreenDefinition]> = [
  [(s) => s[1] === 'kolejka', 'kolejka', () => officeQueueScreen()],
  [(s) => s[1] === 'zapytania' && s.length === 3, 'kolejka', (s) => officeInquiryDetailScreen(s[2] ?? '')],
  [(s) => s[1] === 'do-rozliczenia', 'do-rozliczenia', () => officeSettlementScreen()],
  [(s) => s[1] === 'oferty' && s[2] === 'nowa', 'oferty', () => officeOfferEditorScreen(null)],
  [(s) => s[1] === 'oferty' && s[3] === 'podglad', 'oferty', (s) => officeOfferPreviewScreen(s[2] ?? '')],
  [(s) => s[1] === 'oferty' && s.length === 3, 'oferty', (s) => officeOfferEditorScreen(s[2] ?? '')],
  [(s) => s[1] === 'oferty', 'oferty', () => officeOfferListScreen()],
  [(s) => s[1] === 'agenci' && s[2] === 'nowy', 'agenci', () => officeAgentFormScreen(null)],
  [(s) => s[1] === 'agenci' && s.length === 3, 'agenci', (s) => officeAgentFormScreen(s[2] ?? '')],
  [(s) => s[1] === 'agenci', 'agenci', () => officeAgentListScreen()],
  [(s) => s[1] === 'prowizje', 'prowizje', () => officeCommissionsScreen()],
  [(s) => s[1] === 'raport', 'raport', () => officeReportScreen()],
];

function fromTable(zone: Zone, table: typeof agentRoutes, segments: Segments): ResolvedRoute | null {
  const match = table.find(([matches]) => matches(segments));
  if (!match) return null;
  const [, navKey, build] = match;
  return { zone, navKey, build: () => build(segments) };
}

export function resolveRoute(location: Location): ResolvedRoute | { redirect: string } {
  const segments = location.segments;
  const [first = ''] = segments;
  switch (first) {
    case '':
      return { zone: 'index', navKey: '', build: () => prototypeIndexScreen() };
    case 'logowanie':
      return { zone: 'auth', navKey: '', build: () => loginScreen() };
    case 'aktywacja':
      return { zone: 'auth', navKey: '', build: () => activationScreen(segments[1] ?? '') };
    case 'reset-hasla':
      return { zone: 'auth', navKey: '', build: () => (segments[1] ? passwordResetScreen(segments[1]) : passwordResetRequestScreen()) };
    case 'w':
      return { zone: 'public', navKey: '', build: () => publicQuoteScreen(segments[1] ?? '') };
    case 'agent':
      return fromTable('agent', agentRoutes, segments) ?? { redirect: '/agent/panel' };
    case 'biuro':
      return fromTable('office', officeRoutes, segments) ?? { redirect: '/biuro/kolejka' };
    default:
      return { redirect: '/' };
  }
}
