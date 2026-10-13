import { emptyState, linkButton, pageHeader, rowLink, statusChip, unreadDot } from '../components';
import { Html, html, onChange, onClick } from '../dom';
import { daysBetween, formatAgeInDays, formatDate, formatDateRange, formatMoney } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { agentFullName, clientFullName, currentOfficeUserName, findAgent, findClient, inquiryValue, isSettlementDue, state } from '../store';
import type { Inquiry, InquiryStatus } from '../types';
import type { ScreenDefinition } from '../ui';
import { openCompletionModal } from './office-inquiry';

const queueTabs: Array<{ key: string; label: string; statuses: InquiryStatus[] }> = [
  { key: 'nowe', label: 'Nowe', statuses: ['NEW'] },
  { key: 'wycena', label: 'W wycenie', statuses: ['QUOTING'] },
  { key: 'czeka', label: 'Czeka na agenta / klienta', statuses: ['QUOTE_READY', 'SENT_TO_CLIENT'] },
  { key: 'zaakceptowane', label: 'Zaakceptowane', statuses: ['ACCEPTED'] },
  { key: 'rezerwacje', label: 'Rezerwacje', statuses: ['BOOKING_CONFIRMED'] },
  { key: 'wszystkie', label: 'Wszystkie', statuses: [] },
];

function ageInStatus(inquiry: Inquiry): number {
  return daysBetween(inquiry.statusChangedAt, state.today);
}

function initials(name: string | null): string {
  return name ? name.split(' ').map((part) => part[0]).join('') : '—';
}

export function officeQueueScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const filters = { tab: query.get('widok') ?? 'nowe', agentId: query.get('agent') ?? '', offerId: query.get('oferta') ?? '', mine: query.get('moje') ?? '' };
  const apply = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    navigate(withQuery('/biuro/kolejka', { widok: next.tab, agent: next.agentId, oferta: next.offerId, moje: next.mine }));
  };
  const submitted = state.inquiries.filter((inquiry) => inquiry.status !== 'DRAFT');
  const filtered = submitted.filter(
    (inquiry) =>
      (!filters.agentId || inquiry.agentId === filters.agentId) &&
      (!filters.offerId || inquiry.offerId === filters.offerId) &&
      (!filters.mine || inquiry.handledBy === currentOfficeUserName()),
  );
  const activeTab = queueTabs.find((tab) => tab.key === filters.tab) ?? queueTabs[0]!;
  const inTab = (tab: (typeof queueTabs)[number]) => filtered.filter((inquiry) => tab.statuses.length === 0 || tab.statuses.includes(inquiry.status));
  const rows = inTab(activeTab).sort((left, right) => left.statusChangedAt.localeCompare(right.statusChangedAt));
  const hasFilters = Boolean(filters.agentId || filters.offerId || filters.mine);
  const offersInQueue = [...new Map(submitted.map((inquiry) => [inquiry.offerId, inquiry.offerSnapshot.title])).entries()];
  const agentName = filters.agentId ? agentFullName(findAgent(filters.agentId)) : '';

  const tabsBar = html`<div class="tabs tabs--queue" role="tablist" aria-label="Widoki kolejki">
    ${queueTabs.map((tab) => html`<button role="tab" aria-selected="${tab === activeTab}" class="${tab === activeTab ? 'is-on' : ''}" ${onClick(() => apply({ tab: tab.key }))}>${tab.label} <span class="tab-count">${inTab(tab).length}</span></button>`)}
  </div>`;
  const filterBar = html`<form class="filter-bar" onsubmit="return false" aria-label="Filtry kolejki">
    <label class="filter"><span>Agent</span><select ${onChange((element) => apply({ agentId: element.value }))}><option value="">Wszyscy</option>${state.agents.map((agent) => html`<option value="${agent.id}" ${agent.id === filters.agentId ? 'selected' : ''}>${agentFullName(agent)} – ${agent.companyName}</option>`)}</select></label>
    <label class="filter"><span>Oferta</span><select ${onChange((element) => apply({ offerId: element.value }))}><option value="">Wszystkie</option>${offersInQueue.map(([offerId, title]) => html`<option value="${offerId}" ${offerId === filters.offerId ? 'selected' : ''}>${title}</option>`)}</select></label>
    <label class="check-chip check-chip--inline"><input type="checkbox" ${filters.mine ? 'checked' : ''} ${onChange((element) => apply({ mine: element instanceof HTMLInputElement && element.checked ? '1' : '' }))}><span>Tylko moje</span></label>
  </form>`;

  return {
    screenId: 'B-01',
    title: 'Kolejka zapytań',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać kolejki', text: 'Spróbuj ponownie za chwilę.', code: 'GET /inquiries · 503' },
    render: () => html`${pageHeader({ eyebrow: `Biuro · ${formatDate(state.today)}`, title: 'Kolejka zapytań', lead: agentName ? `Filtr: agent ${agentName}.` : 'Najstarsze na górze. Wiek liczymy od ostatniej zmiany statusu.' })}
      ${tabsBar}
      ${filterBar}
      ${rows.length === 0
        ? emptyState(
            hasFilters
              ? { title: `Brak zapytań w widoku „${activeTab.label}” dla wybranych filtrów`, text: 'Zmień filtr albo zobacz wszystkie zapytania.', action: linkButton('Wyczyść filtry', withQuery('/biuro/kolejka', { widok: activeTab.key })) }
              : { title: activeTab.key === 'nowe' ? 'Wszystkie nowe zapytania są przejęte' : `Brak zapytań w widoku „${activeTab.label}”`, text: 'Nowe zapytania od agentów pojawią się tutaj z licznikiem w menu.' },
          )
        : html`<div class="table-wrap"><table class="table table--dense">
            <thead><tr><th>Numer</th><th>Wiek</th><th>Status</th><th>Agent</th><th>Klient</th><th>Oferta</th><th>Termin</th><th class="numeric">Uczest.</th><th class="numeric">Wartość</th><th>Obsługuje</th></tr></thead>
            <tbody>${rows.map((inquiry) => queueRow(inquiry))}</tbody>
          </table></div>`}`,
  };
}

function queueRow(inquiry: Inquiry): Html {
  const age = ageInStatus(inquiry);
  const stale = age > 2 && ['NEW', 'QUOTING', 'ACCEPTED'].includes(inquiry.status);
  const agent = findAgent(inquiry.agentId);
  const client = findClient(inquiry.clientId);
  const value = inquiryValue(inquiry);
  return html`<tr class="is-clickable ${inquiry.unreadForOffice ? 'is-unread' : ''}" ${rowLink(`/biuro/zapytania/${inquiry.id}`)}>
    <td data-label="Numer" class="mono">${unreadDot(inquiry.unreadForOffice)}<a href="#/biuro/zapytania/${inquiry.id}">${inquiry.number}</a></td>
    <td data-label="Wiek"><span class="age ${stale ? 'age--stale' : ''}">${formatAgeInDays(age)}</span></td>
    <td data-label="Status">${statusChip(inquiry)}</td>
    <td data-label="Agent">${agentFullName(agent)}<br><span class="muted small">${agent.companyName}</span></td>
    <td data-label="Klient">${clientFullName(client)}<br><span class="muted small">${client?.school ?? ''}${client?.city ? `, ${client.city}` : ''}</span></td>
    <td data-label="Oferta">${inquiry.offerSnapshot.title}</td>
    <td data-label="Termin">${formatDateRange(inquiry.dateFrom, inquiry.dateTo)}</td>
    <td data-label="Uczestnicy" class="numeric">${inquiry.students}+${inquiry.guardians}</td>
    <td data-label="Wartość" class="numeric mono">${value.estimated ? '—' : formatMoney(value.value)}</td>
    <td data-label="Obsługuje"><span class="initials" title="${inquiry.handledBy ?? 'Nieprzejęte'}">${initials(inquiry.handledBy)}</span></td>
  </tr>`;
}

export function officeSettlementScreen(): ScreenDefinition {
  const rows = state.inquiries.filter(isSettlementDue).sort((left, right) => left.dateTo.localeCompare(right.dateTo));
  const allSettled = emptyState({ title: 'Wszystkie zakończone wyjazdy są rozliczone', text: 'Rezerwacje pojawią się tu dzień po dacie powrotu.' });
  return {
    screenId: 'B-04',
    title: 'Do rozliczenia',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać listy', text: 'Spróbuj ponownie.', code: 'GET /inquiries/settlement-due · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Rezerwacje po powrocie', title: 'Do rozliczenia', lead: 'Oznacz realizację z wartością końcową – na jej podstawie naliczymy prowizję należną.' })}
      ${rows.length === 0
        ? allSettled
        : html`<div class="table-wrap"><table class="table">
            <thead><tr><th>Numer</th><th>Agent</th><th>Klient</th><th>Oferta</th><th>Powrót</th><th class="numeric">Wartość wyceny</th><th>Umowa</th><th><span class="visually-hidden">Akcja</span></th></tr></thead>
            <tbody>${rows.map((inquiry) => html`<tr>
              <td data-label="Numer" class="mono"><a href="#/biuro/zapytania/${inquiry.id}">${inquiry.number}</a></td>
              <td data-label="Agent">${agentFullName(findAgent(inquiry.agentId))}</td>
              <td data-label="Klient">${clientFullName(findClient(inquiry.clientId))}</td>
              <td data-label="Oferta">${inquiry.offerSnapshot.title}</td>
              <td data-label="Powrót">${formatDate(inquiry.dateTo)} <span class="muted small">(${formatAgeInDays(daysBetween(inquiry.dateTo, state.today))} temu)</span></td>
              <td data-label="Wartość wyceny" class="numeric mono">${formatMoney(inquiryValue(inquiry).value)}</td>
              <td data-label="Umowa" class="mono">${inquiry.contractNumber ?? '—'}</td>
              <td><button class="button button--primary button--small" ${onClick(() => openCompletionModal(inquiry))}>Oznacz jako zrealizowaną</button></td>
            </tr>`)}</tbody>
          </table></div>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Rezerwacje po powrocie', title: 'Do rozliczenia' })}${allSettled}`,
  };
}
