import { emptyState, linkButton, pageHeader, statusChip } from '../components';
import { html, onChange } from '../dom';
import { formatDate, formatMoney, formatWholeMoney, inquiryStatusLabels } from '../format';
import { withQuery } from '../navigation';
import {
  agentActionItems,
  clientFullName,
  currentAgent,
  findClient,
  funnelStatuses,
  inquiriesOfAgent,
  inquiryValue,
  state,
} from '../store';
import type { CommissionStatus, Inquiry } from '../types';
import { requestRender, type ScreenDefinition } from '../ui';

export const salesPeriods = [
  { value: 'school-2026', label: 'Rok szkolny 2026/27', from: '2026-09-01', to: '2027-08-31' },
  { value: 'school-2025', label: 'Rok szkolny 2025/26', from: '2025-09-01', to: '2026-08-31' },
  { value: 'calendar-2026', label: 'Rok kalendarzowy 2026', from: '2026-01-01', to: '2026-12-31' },
];

let selectedPeriodValue = salesPeriods[0]?.value ?? '';

export function periodByValue(value: string) {
  return salesPeriods.find((period) => period.value === value) ?? salesPeriods[0]!;
}

const bookedStatuses = ['BOOKING_CONFIRMED', 'COMPLETED'];
const lostStatuses = ['REJECTED_BY_OFFICE', 'REJECTED_BY_CLIENT', 'WITHDRAWN_BY_AGENT', 'CANCELLED'];

export function salesResults(inquiries: Inquiry[], from: string, to: string) {
  const booked = inquiries.filter((inquiry) => bookedStatuses.includes(inquiry.status) && inquiry.confirmedAt && inquiry.confirmedAt.slice(0, 10) >= from && inquiry.confirmedAt.slice(0, 10) <= to);
  const lost = inquiries.filter((inquiry) => lostStatuses.includes(inquiry.status) && inquiry.statusChangedAt.slice(0, 10) >= from && inquiry.statusChangedAt.slice(0, 10) <= to);
  const closedCount = booked.length + lost.length;
  return {
    bookedCount: booked.length,
    bookedValue: booked.reduce((sum, inquiry) => sum + inquiryValue(inquiry).value, 0),
    participants: booked.reduce((sum, inquiry) => sum + (inquiry.completion?.actualParticipants ?? inquiry.students), 0),
    conversion: closedCount === 0 ? null : Math.round((booked.length / closedCount) * 100),
    closedCount,
  };
}

export function commissionTotals(inquiries: Inquiry[]): Record<CommissionStatus, number> {
  const totals: Record<CommissionStatus, number> = { FORECAST: 0, DUE: 0, PAID: 0, CANCELLED: 0 };
  inquiries.forEach((inquiry) => {
    if (!inquiry.commission) return;
    totals[inquiry.commission.status] += inquiry.commission.status === 'CANCELLED' ? inquiry.commission.baseValue * (inquiry.commission.rate / 100) : inquiry.commission.amount;
  });
  return totals;
}

function actionItemsSection() {
  const items = agentActionItems(state.currentAgentId);
  return html`<section class="panel panel--action" aria-labelledby="action-heading">
    <header class="panel__header">
      <h2 id="action-heading" class="panel__title">Wymaga akcji</h2>
      <span class="count-badge">${items.length}</span>
    </header>
    ${items.length === 0
      ? emptyState({ title: 'Nic nie czeka na Twój ruch', text: 'Gdy biuro wystawi wycenę albo napisze w wątku, sprawa pojawi się tutaj.', action: linkButton('Przeglądaj oferty', '#/agent/oferty') })
      : html`<ul class="action-list">
          ${items.map((item) => {
            const client = findClient(item.inquiry.clientId);
            return html`<li>
              <a class="action-item" href="#/agent/zapytania/${item.inquiry.id}">
                <span class="action-item__reason action-item__reason--${item.tone}">${item.reason}</span>
                <span class="action-item__subject">${clientFullName(client)} · ${client?.school ?? ''} · ${item.inquiry.offerSnapshot.title}</span>
                <span class="action-item__meta mono">${item.inquiry.number}</span>
                <span class="action-item__status">${statusChip(item.inquiry)}</span>
              </a>
            </li>`;
          })}
        </ul>`}
  </section>`;
}

function funnelSection() {
  const inquiries = inquiriesOfAgent(state.currentAgentId);
  return html`<section class="panel" aria-labelledby="funnel-heading">
    <header class="panel__header"><h2 id="funnel-heading" class="panel__title">Lejek</h2><p class="panel__hint">Zapytania w toku według etapu. Kliknij etap, żeby zobaczyć listę.</p></header>
    <ol class="funnel">
      ${funnelStatuses.map((status) => {
        const inStatus = inquiries.filter((inquiry) => inquiry.status === status);
        const total = inStatus.reduce((sum, inquiry) => sum + inquiryValue(inquiry).value, 0);
        const awaitingQuote = status === 'NEW' || status === 'QUOTING';
        return html`<li>
          <a class="funnel__stop ${inStatus.length === 0 ? 'is-empty' : ''}" href="${withQuery('/agent/zapytania', { status })}">
            <span class="funnel__label">${inquiryStatusLabels[status]}</span>
            <span class="funnel__count">${inStatus.length}</span>
            <span class="funnel__sum mono">${awaitingQuote ? 'bez wyceny' : formatWholeMoney(total)}</span>
          </a>
        </li>`;
      })}
    </ol>
  </section>`;
}

function salesSection() {
  const period = periodByValue(selectedPeriodValue);
  const results = salesResults(inquiriesOfAgent(state.currentAgentId), period.from, period.to);
  return html`<section class="panel" aria-labelledby="sales-heading">
    <header class="panel__header">
      <h2 id="sales-heading" class="panel__title">Wyniki sprzedaży</h2>
      <label class="inline-select"><span class="visually-hidden">Okres</span>
        <select ${onChange((element) => {
          selectedPeriodValue = element.value;
          requestRender();
        })}>${salesPeriods.map((option) => html`<option value="${option.value}" ${option.value === period.value ? 'selected' : ''}>${option.label}</option>`)}</select>
      </label>
    </header>
    <dl class="figures">
      <div><dt>Potwierdzone rezerwacje</dt><dd>${results.bookedCount}</dd><dd class="figures__sub">${formatMoney(results.bookedValue)}</dd></div>
      <div><dt>Uczestnicy</dt><dd>${results.participants}</dd></div>
      <div><dt>Konwersja</dt><dd>${results.conversion === null ? '—' : `${results.conversion}%`}</dd><dd class="figures__sub">${results.closedCount === 0 ? 'brak zamkniętych zapytań' : `z ${results.closedCount} zamkniętych`}</dd></div>
    </dl>
    <p class="footnote">${formatDate(period.from)} – ${formatDate(period.to)}. Rezerwację liczymy w dniu potwierdzenia przez biuro.</p>
  </section>`;
}

function commissionSection() {
  const totals = commissionTotals(inquiriesOfAgent(state.currentAgentId));
  return html`<section class="panel" aria-labelledby="commission-heading">
    <header class="panel__header"><h2 id="commission-heading" class="panel__title">Prowizje</h2><a class="text-link" href="#/agent/prowizje">Wszystkie pozycje →</a></header>
    <dl class="ledger">
      <div><dt>Prognozowana</dt><dd>${formatMoney(totals.FORECAST)}</dd></div>
      <div class="ledger__due"><dt>Należna</dt><dd>${formatMoney(totals.DUE)}</dd></div>
      <div><dt>Wypłacona</dt><dd>${formatMoney(totals.PAID)}</dd></div>
      <div class="ledger__cancelled"><dt>Anulowana</dt><dd>${formatMoney(totals.CANCELLED)}</dd></div>
    </dl>
  </section>`;
}

export function agentDashboardScreen(): ScreenDefinition {
  const agent = currentAgent();
  const actionCount = new Set(agentActionItems(agent.id).map((item) => item.inquiry.id)).size;
  return {
    screenId: 'A-01',
    title: 'Panel',
    skeleton: 'dashboard',
    errorCopy: { title: 'Nie udało się wczytać panelu', text: 'Sprawdź połączenie i spróbuj ponownie. Twoje zapytania są bezpieczne.', code: 'GET /me/action-items · 503' },
    render: () => html`${pageHeader({
        eyebrow: `Panel agenta · ${formatDate(state.today)}`,
        title: `Dzień dobry, ${agent.firstName}`,
        lead: actionCount === 0 ? 'Wszystkie sprawy są po stronie biura albo klientów.' : `${actionCount} ${actionCount === 1 ? 'zapytanie czeka' : 'zapytania czekają'} na Twój ruch.`,
        actions: linkButton('Znajdź ofertę', '#/agent/oferty', 'primary'),
      })}
      <div class="dashboard">
        ${actionItemsSection()}
        ${funnelSection()}
        <div class="dashboard__pair">${salesSection()}${commissionSection()}</div>
      </div>`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Panel agenta', title: `Dzień dobry, ${agent.firstName}` })}
      ${emptyState({ title: 'Zacznij od pierwszego zapytania', text: 'Znajdź ofertę pasującą do klasy, dodaj klienta i wyślij zapytanie do biura. Panel pokaże tu wyceny, lejek i prowizje.', action: linkButton('Przeglądaj oferty', '#/agent/oferty', 'primary') })}`,
  };
}
