import { emptyState, pageHeader } from '../components';
import { html, onChange, onClick } from '../dom';
import { formatDate, formatMoney } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { agentFullName, inquiriesOfAgent, state } from '../store';
import type { Agent } from '../types';
import type { ScreenDefinition } from '../ui';
import { commissionTotals, periodByValue, salesPeriods, salesResults } from './agent-dashboard';

type SortKey = 'inquiries' | 'bookings' | 'conversion' | 'value';

interface AgentReportRow {
  agent: Agent;
  inquiries: number;
  bookings: number;
  conversion: number | null;
  value: number;
  forecast: number;
  due: number;
  paid: number;
}

export function officeReportScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const period = periodByValue(query.get('okres') ?? salesPeriods[0]?.value ?? '');
  const sortKey = (['inquiries', 'bookings', 'conversion', 'value'] as const).find((key) => key === query.get('sort')) ?? 'value';
  const apply = (patch: { okres?: string; sort?: SortKey }) => navigate(withQuery('/biuro/raport', { okres: period.value, sort: sortKey, ...patch }));
  const rows: AgentReportRow[] = state.agents
    .map((agent) => {
      const inquiries = inquiriesOfAgent(agent.id).filter((inquiry) => inquiry.status !== 'DRAFT');
      const inPeriod = inquiries.filter((inquiry) => inquiry.createdAt.slice(0, 10) >= period.from && inquiry.createdAt.slice(0, 10) <= period.to);
      const results = salesResults(inquiries, period.from, period.to);
      const totals = commissionTotals(inquiries.filter((inquiry) => inquiry.dateFrom >= period.from && inquiry.dateFrom <= period.to));
      return { agent, inquiries: inPeriod.length, bookings: results.bookedCount, conversion: results.conversion, value: results.bookedValue, forecast: totals.FORECAST, due: totals.DUE, paid: totals.PAID };
    })
    .filter((row) => row.inquiries + row.bookings + row.forecast + row.due + row.paid > 0)
    .sort((left, right) => (right[sortKey] ?? -1) - (left[sortKey] ?? -1));
  const sum = (key: 'inquiries' | 'bookings' | 'value' | 'forecast' | 'due' | 'paid') => rows.reduce((total, row) => total + row[key], 0);
  const sortHeader = (key: SortKey, label: string) => html`<th class="numeric" aria-sort="${sortKey === key ? 'descending' : 'none'}"><button class="sort-button" ${onClick(() => apply({ sort: key }))}>${label}${sortKey === key ? ' ↓' : ''}</button></th>`;
  return {
    screenId: 'B-11',
    title: 'Raport agentów',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać raportu', text: 'Spróbuj ponownie.', code: 'GET /reports/agents · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Raport', title: 'Wyniki agentów', lead: `${formatDate(period.from)} – ${formatDate(period.to)}. Rezerwacje liczone w dniu potwierdzenia, zapytania w dniu złożenia.` })}
      <div class="toolbar"><label class="filter"><span>Okres</span><select ${onChange((element) => apply({ okres: element.value }))}>${salesPeriods.map((option) => html`<option value="${option.value}" ${option.value === period.value ? 'selected' : ''}>${option.label}</option>`)}</select></label></div>
      ${rows.length === 0
        ? emptyState({ title: `Brak zapytań w okresie ${formatDate(period.from)} – ${formatDate(period.to)}`, text: 'Wybierz inny okres.' })
        : html`<div class="table-wrap"><table class="table">
            <thead><tr><th>Agent</th>${sortHeader('inquiries', 'Zapytania')}${sortHeader('bookings', 'Rezerwacje')}${sortHeader('conversion', 'Konwersja')}${sortHeader('value', 'Sprzedaż')}<th class="numeric">Prow. prognoz.</th><th class="numeric">Prow. należne</th><th class="numeric">Prow. wypłacone</th></tr></thead>
            <tbody>${rows.map((row) => html`<tr class="is-clickable" ${onClick(() => navigate(withQuery('/biuro/kolejka', { widok: 'wszystkie', agent: row.agent.id })))}>
              <td data-label="Agent"><a href="${withQuery('/biuro/kolejka', { widok: 'wszystkie', agent: row.agent.id })}"><strong>${agentFullName(row.agent)}</strong></a><br><span class="muted small">${row.agent.companyName}</span></td>
              <td data-label="Zapytania" class="numeric">${row.inquiries}</td>
              <td data-label="Rezerwacje" class="numeric">${row.bookings}</td>
              <td data-label="Konwersja" class="numeric">${row.conversion === null ? '—' : html`<span class="bar-cell"><span class="bar-cell__bar" style="width:${row.conversion}%"></span>${row.conversion}%</span>`}</td>
              <td data-label="Sprzedaż" class="numeric mono">${formatMoney(row.value)}</td>
              <td data-label="Prognozowane" class="numeric mono">${formatMoney(row.forecast)}</td>
              <td data-label="Należne" class="numeric mono">${formatMoney(row.due)}</td>
              <td data-label="Wypłacone" class="numeric mono">${formatMoney(row.paid)}</td>
            </tr>`)}</tbody>
            <tfoot><tr><th>Razem</th><td class="numeric">${sum('inquiries')}</td><td class="numeric">${sum('bookings')}</td><td></td><td class="numeric mono">${formatMoney(sum('value'))}</td><td class="numeric mono">${formatMoney(sum('forecast'))}</td><td class="numeric mono">${formatMoney(sum('due'))}</td><td class="numeric mono">${formatMoney(sum('paid'))}</td></tr></tfoot>
          </table></div>`}`,
  };
}
