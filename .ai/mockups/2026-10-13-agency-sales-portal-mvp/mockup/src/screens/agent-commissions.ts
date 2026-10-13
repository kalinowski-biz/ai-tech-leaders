import { commissionChip, emptyState, linkButton, pageHeader, rowLink } from '../components';
import { html, onChange, onClick } from '../dom';
import { commissionStatusLabels, formatDate, formatMoney, formatRate } from '../format';
import { currentLocation, navigate, withQuery } from '../navigation';
import { clientFullName, findClient, inquiriesOfAgent, state } from '../store';
import type { CommissionStatus } from '../types';
import type { ScreenDefinition } from '../ui';
import { commissionTotals, periodByValue, salesPeriods } from './agent-dashboard';

const commissionStatuses: CommissionStatus[] = ['FORECAST', 'DUE', 'PAID', 'CANCELLED'];

export function agentCommissionsScreen(): ScreenDefinition {
  const query = currentLocation().query;
  const statusFilter = query.get('status') ?? '';
  const periodValue = query.get('okres') ?? salesPeriods[0]?.value ?? '';
  const period = periodByValue(periodValue);
  const apply = (patch: { status?: string; okres?: string }) => navigate(withQuery('/agent/prowizje', { status: statusFilter, okres: periodValue, ...patch }));
  const inPeriod = inquiriesOfAgent(state.currentAgentId).filter((inquiry) => inquiry.commission && inquiry.dateFrom >= period.from && inquiry.dateFrom <= period.to);
  const rows = inPeriod.filter((inquiry) => !statusFilter || inquiry.commission?.status === statusFilter);
  const totals = commissionTotals(inPeriod);
  const noCommissions = emptyState({ title: 'Nie masz jeszcze prowizji', text: 'Prowizja prognozowana pojawi się, gdy klient zaakceptuje wycenę.', action: linkButton('Moje zapytania', '#/agent/zapytania') });
  return {
    screenId: 'A-09',
    title: 'Prowizje',
    skeleton: 'list',
    errorCopy: { title: 'Nie udało się wczytać prowizji', text: 'Spróbuj ponownie za chwilę.', code: 'GET /me/commissions · 503' },
    render: () => html`${pageHeader({ eyebrow: 'Rozliczenia', title: 'Prowizje', lead: 'Prognozowana = wartość zaakceptowanej wyceny × stawka. Należna = wartość końcowa × stawka. Fakturę wystawiasz poza portalem.' })}
      <div class="toolbar">
        <label class="filter"><span>Wyjazdy w okresie</span>
          <select ${onChange((element) => apply({ okres: element.value }))}>${salesPeriods.map((option) => html`<option value="${option.value}" ${option.value === period.value ? 'selected' : ''}>${option.label}</option>`)}</select>
        </label>
      </div>
      <dl class="ledger ledger--filters">
        ${commissionStatuses.map((status) => html`<div class="${statusFilter === status ? 'is-on' : ''}">
          <dt><button class="ledger__filter" aria-pressed="${statusFilter === status}" ${onClick(() => apply({ status: statusFilter === status ? '' : status }))}>${commissionStatusLabels[status]}</button></dt>
          <dd>${formatMoney(totals[status])}</dd>
        </div>`)}
      </dl>
      ${inPeriod.length === 0
        ? noCommissions
        : rows.length === 0
          ? emptyState({ title: `Brak prowizji w statusie „${commissionStatusLabels[commissionStatuses.find((status) => status === statusFilter) ?? 'FORECAST']}”`, text: 'Zmień filtr, żeby zobaczyć pozostałe pozycje.', action: linkButton('Wyczyść filtry', '#/agent/prowizje') })
          : html`<div class="table-wrap"><table class="table">
              <thead><tr><th>Zapytanie</th><th>Klient</th><th class="numeric">Wartość</th><th class="numeric">Stawka</th><th class="numeric">Kwota</th><th>Status</th><th>Wypłata</th></tr></thead>
              <tbody>${rows.map((inquiry) => {
                const commission = inquiry.commission;
                if (!commission) return '';
                return html`<tr class="is-clickable" ${rowLink(`/agent/zapytania/${inquiry.id}`)}>
                  <td data-label="Zapytanie" class="mono"><a href="#/agent/zapytania/${inquiry.id}">${inquiry.number}</a><br><span class="muted small">${inquiry.offerSnapshot.title}</span></td>
                  <td data-label="Klient">${clientFullName(findClient(inquiry.clientId))}</td>
                  <td data-label="Wartość" class="numeric mono">${formatMoney(commission.baseValue)}</td>
                  <td data-label="Stawka" class="numeric mono">${formatRate(commission.rate)}</td>
                  <td data-label="Kwota" class="numeric mono"><strong>${formatMoney(commission.amount)}</strong></td>
                  <td data-label="Status">${commissionChip(commission.status)}</td>
                  <td data-label="Wypłata">${commission.paidOn ? formatDate(commission.paidOn) : '—'}</td>
                </tr>`;
              })}</tbody>
            </table></div>`}`,
    renderEmpty: () => html`${pageHeader({ eyebrow: 'Rozliczenia', title: 'Prowizje' })}${noCommissions}`,
  };
}
